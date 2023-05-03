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
    static description = ''
  
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

            const frontEndBuildConfigPath = resolve(rootDir, '../../../../../../../frontend/app.config.js');

            console.log(frontEndBuildConfigPath)

            // TODO: figure out how to let these values live in frontend and be accessed here
            // might have to break them out to their own js file and require them in both places
            const frontEndConfig = require(frontEndBuildConfigPath);

            console.log(frontEndConfig)

            const connString = config.MONGO_CONNECTION_STRING.get().connection_string;

            const dbManager = await DBManager.fromConnectionString(connString);
            const pubSubManager = await PubSubManager.create();

            // TODO: get this from source 
            await dbManager.upsertDynamicConfig({
                appVersion: {
                    latestIOS: '12.0.0',
                    latestAndroid: '12.0.0(1)',
                    requiresUpdate: false,
                }
            })

            await pubSubManager.sys(PatchEventType.SystemDynamicConfigUpdated, {})

            await dbManager.closeConnection()

            this.log(`successfully sent data`)
        } catch (e) {
            this.logToStderr(e)
            this.exit(1)
        }
    }
}