require('module-alias/register');

import { Command, Flags } from "@oclif/core";
import { DynamicAppVersionConfig, DynamicConfig, PatchEventType } from "common/models";
import { Environment, EnvironmentId } from "infra/src/environment";
import { enumVariants, expoVersionFormat, versionFromExpoFormat } from "infra/src/utils";
import { resolve } from "path";
import { PatchMongoDBConfig } from "../../../../infra/src/config";
import { DBManager } from "../../../common/dbManager"
import { trySetupLocalEnv, trySetupLocalGCPCredentials } from "../../../common/env";
import { PubSubManager } from "../../../common/pubSubManager";
import config from "../../../config";

export default class UpdateDynamicConfig extends Command {
    static description = 'Update DynamicConfig based on the configuration associated with an env and the current build in source'
  
    static flags = {
        help: Flags.help({ char: 'h' }),
        newNativeVersion: Flags.boolean({
            description: 'Flag indicating this is being run as part of the preprod deployment process for a release with native changes that required a new build of the frontend'
        }),
        approve: Flags.boolean({
            description: 'Flag indicating this is approving a release that has been tested in preprod',
            exclusive: ['newNativeVersion']
        })
    }

    async addPreProdRelease(
        conf: Omit<DynamicAppVersionConfig, 'testing'>,
        dbManager: DBManager,
        dynamicConfig?: DynamicConfig
    ) {
        if (!dynamicConfig) {
            // first time deploying to this env
            dynamicConfig = {
                appVersion: []
            }
        }

        // Make sure the new version isn't in here yet
        if (dynamicConfig.appVersion.every((c) => c.latestIOS != conf.latestIOS)) {
            
            dynamicConfig.appVersion.push({
                latestIOS: conf.latestIOS,
                latestAndroid: conf.latestAndroid,
                requiresUpdate: conf.requiresUpdate,
                testing: true // testing allways on for preprod
            })

            await dbManager.upsertDynamicConfig(dynamicConfig)
            
        } else {
            // this shouldn't happen
            this.error(`The target Version ${versionFromExpoFormat(conf.latestIOS)} already exists in the dynamicConfig. Please make sure to update 'version.js' before starting the release preprod deployment flow`, {
                code: '1'
            });
        }
    }

    async approveRelease(
        conf: Omit<DynamicAppVersionConfig, 'testing'>,
        dbManager: DBManager,
        pubSubManager: PubSubManager, 
        dynamicConfig?: DynamicConfig
    ) {
        if (!dynamicConfig) {
            // this shouldn't happen
            this.error(`Could not get any dynamicConfig during release approval of version ${versionFromExpoFormat(conf.latestIOS)}`, {
                code: '1'
            });
        }

        let shouldNotify = false;
        const appVersionConfig = dynamicConfig.appVersion.find((c) => c.latestIOS == conf.latestIOS)

        if (appVersionConfig) {
            // if native changes required the testing flag, turn it off
            if (appVersionConfig.testing) {
                appVersionConfig.testing = false
                shouldNotify = true
            }

            // if backend breaking changes require users to update to this version
            // but there aren't native changes requiring a new native build
            // mark as required in place
            if (!appVersionConfig.requiresUpdate && conf.requiresUpdate) {
                appVersionConfig.requiresUpdate = true
                shouldNotify = true
            }
        } else {
            // this shouldn't happen
            this.error(`Could not find existing dynamicConfig appVersion entry to update during release approval of version ${versionFromExpoFormat(conf.latestIOS)}`, {
                code: '1'
            });
        }

        // cleanup old app versions that failed testing so were never promoted
        const cleanedAppVersions = dynamicConfig.appVersion.filter((verionConfig) => {
            const isCurrentRelease = verionConfig.latestIOS == conf.latestIOS

            return isCurrentRelease || !verionConfig.testing
        })

        const cleanupRequired = cleanedAppVersions.length != dynamicConfig.appVersion.length

        if (cleanupRequired) {
            dynamicConfig.appVersion = cleanedAppVersions
        }

        if (cleanupRequired || shouldNotify) {
            await dbManager.upsertDynamicConfig(dynamicConfig)
        }

        if (shouldNotify) {
            // save and notify users that the version config was updated
            await pubSubManager.sys(PatchEventType.SystemDynamicConfigUpdated, {})
        }
    }
  
    async run() {
        try {
            const { flags } = await this.parse(UpdateDynamicConfig)

            if (!flags.newNativeVersion && !flags.approve) {
                this.error('Either the --newNativeVersion or the --approve flag is required.', {
                    code: '1'
                });

                return
              } 

            // trySetupLocalEnv(envId)
            // trySetupLocalGCPCredentials(envId)

            // *** rootdir is from output lib file structure not src ***
            const rootDir = __dirname;

            const frontEndBuildConfigPath = resolve(rootDir, '../../../../../../../frontend/version.js');

            const { VERSION, ANDROID_VERSION_CODE, IOS_VERSION_CODE, REQUIRES_UPDATE } = require(frontEndBuildConfigPath);

            // MONGO_CREDS get passed in by GCP as a secret
            // Need to init mongo config here so connection string can be put together below
            await config.MONGO.init(EnvironmentId.prod)
            const connString = config.MONGO_CONNECTION_STRING.get().connection_string;
            
            console.log('Creating DBManager')
            const dbManager = await DBManager.fromConnectionString(connString);
            
            // this will need probably need trySetupLocalGCPCredentials() to run locally i think???
            console.log('Creating PubSubManager')
            const pubSubManager = await PubSubManager.create();

            console.log('Getting dynamicConfig')
            const dynamicConfig = await dbManager.getDynamicConfig()

            const iosVersion = expoVersionFormat(VERSION, IOS_VERSION_CODE);
            const androidVersion = expoVersionFormat(VERSION, ANDROID_VERSION_CODE)

            if (flags.newNativeVersion) {
                await this.addPreProdRelease({
                        latestIOS: iosVersion,
                        latestAndroid: androidVersion,
                        requiresUpdate: REQUIRES_UPDATE,
                    },
                    dbManager,
                    dynamicConfig?.toJSON()
                )
            } else {
                await this.approveRelease({
                        latestIOS: iosVersion,
                        latestAndroid: androidVersion,
                        requiresUpdate: REQUIRES_UPDATE,
                    },
                    dbManager,
                    pubSubManager, 
                    dynamicConfig?.toJSON()
                )
            }

            await dbManager.closeConnection()

            this.log(`successfully sent data`)
        } catch (e) {
            this.logToStderr(e)
            this.exit(1)
        }
    }
}