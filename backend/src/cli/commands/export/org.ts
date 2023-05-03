require('module-alias/register');

import { Command, Flags } from "@oclif/core";
import { DBManager } from "../../../common/dbManager"
import { trySetupLocalEnv } from "../../../common/env";
import { User } from "../../../../../common/models";
import config from "../../../config";
import { UserModel } from "../../../models/user";
import { mkdir, writeFile } from "fs/promises";

trySetupLocalEnv()

export default class ExportOrg extends Command {
    static description = ''
  
    static flags = {
        help: Flags.help({ char: 'h' }),
        orgId: Flags.string({ char: 'i', required: true }),
        dir: Flags.string({ char: 'd' })
    }
  

    // TODO: command for updating config dbManager.upsertDynamicConfig

    async run() {
        try {
            const { flags } = await this.parse(ExportOrg)

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