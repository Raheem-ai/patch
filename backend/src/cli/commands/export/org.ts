require('module-alias/register');

import { Command, Flags } from "@oclif/core";
import { DBManager } from "../../../common/dbManager"
import { trySetupLocalEnv } from "../../../common/env";
import { User } from "../../../../../common/models";
import config from "../../../config";
import { mkdir, writeFile } from "fs/promises";
import { EnvironmentId } from "infra/src/environment";
import { enumVariants } from "infra/src/utils";

export default class ExportOrg extends Command {
    static description = 'Export all data associated with an org'
  
    static flags = {
        help: Flags.help({ char: 'h' }),
        orgId: Flags.string({ char: 'i', required: true }),
        dir: Flags.string({ char: 'd' }),
        env: Flags.string({
            char: 'e', 
            required: true,
            description: 'Target enviroment ',
            options: enumVariants(EnvironmentId)
        }),
    }
  
    async run() {
        try {
            const { flags } = await this.parse(ExportOrg)

            const envId = EnvironmentId[flags.env];

            trySetupLocalEnv(envId)

            const connString = config.MONGO_CONNECTION_STRING.get().connection_string;

            const dbManager = await DBManager.fromConnectionString(connString);

            const rawOrg = await dbManager.getOrganization({ _id: flags.orgId })

            const org = rawOrg.toObject({ virtuals: true })
            
            const requests = (await dbManager.getRequests({ orgId: flags.orgId })).map(dbManager.fullHelpRequest)
            
            const users = JSON.parse(JSON.stringify(org.members.map((user) => dbManager.protectedUser(user as User))))

            org.members = users.map(member => member.id)

            const basePath = flags.dir || flags.orgId;

            // make sure dir exists
            await mkdir(basePath, { recursive: true })

            const orgFilePath = `${basePath}/org.json`
            const reqFilePath = `${basePath}/requests.json`
            const userFilePath = `${basePath}/users.json`

            await writeFile(orgFilePath, JSON.stringify(org, null, 4))
            await writeFile(reqFilePath, JSON.stringify(requests, null, 4))
            await writeFile(userFilePath, JSON.stringify(users, null, 4))

            await dbManager.closeConnection()

            this.log(`Data exported to ${orgFilePath}, ${reqFilePath}, and ${userFilePath}`)
        } catch (e) {
            this.logToStderr(e)
            this.exit(1)
        }
    }
}