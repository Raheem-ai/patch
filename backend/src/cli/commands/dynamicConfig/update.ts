require('module-alias/register');

import { Command, Flags } from "@oclif/core";
import { PatchEventType } from "common/models";
import { EnvironmentId } from "infra/src/environment";
import { enumVariants } from "infra/src/utils";
import { resolve } from "path";
import { DBManager } from "../../../common/dbManager"
import { trySetupLocalEnv, trySetupLocalGCPCredentials } from "../../../common/env";
import { PubSubManager } from "../../../common/pubSubManager";
import config from "../../../config";

export default class UpdateDynamicConfig extends Command {
    static description = 'Update DynamicConfig based on the configuration associated with an env and the current build in source'
  
    static flags = {
        help: Flags.help({ char: 'h' }),
        env: Flags.string({
            char: 'e', 
            required: true,
            description: 'Target enviroment ',
            options: enumVariants(EnvironmentId)
        }),
    }
  
    async run() {
        try {
            const { flags } = await this.parse(UpdateDynamicConfig)

            const envId = EnvironmentId[flags.env];

            trySetupLocalEnv(envId)
            trySetupLocalGCPCredentials(envId)

            // *** rootdir is from output lib file structure not src ***
            const rootDir = __dirname;

            const frontEndBuildConfigPath = resolve(rootDir, '../../../../../../../frontend/version.js');

            const { VERSION, ANDROID_VERSION_CODE, REQUIRES_UPDATE } = require(frontEndBuildConfigPath);

            const connString = config.MONGO_CONNECTION_STRING.get().connection_string;

            const dbManager = await DBManager.fromConnectionString(connString);
            const pubSubManager = await PubSubManager.create();

            const dynamicConfig = await dbManager.getDynamicConfig()

            if (dynamicConfig) {
                const copy = dynamicConfig.toJSON();

                // if this version hasn't already been added
                if (copy.appVersion.every((conf) => conf.latestIOS != VERSION)) {
                    copy.appVersion.push({
                        latestIOS: VERSION,
                        latestAndroid: `${VERSION}(${ANDROID_VERSION_CODE})`,
                        requiresUpdate: REQUIRES_UPDATE,
                    })
    
                    await dbManager.upsertDynamicConfig(copy)
                }

            } else {
                // first time deploying to this env
                await dbManager.upsertDynamicConfig({
                    appVersion: [
                        {
                            latestIOS: VERSION,
                            latestAndroid: `${VERSION}(${ANDROID_VERSION_CODE})`,
                            requiresUpdate: REQUIRES_UPDATE,
                        }
                    ]
                })
            }

            await pubSubManager.sys(PatchEventType.SystemDynamicConfigUpdated, {})

            await dbManager.closeConnection()

            this.log(`successfully sent data`)
        } catch (e) {
            this.logToStderr(e)
            this.exit(1)
        }
    }
}