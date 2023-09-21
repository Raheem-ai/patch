require('module-alias/register');

import { Command, Flags } from "@oclif/core";
import { DBManager } from "../../../common/dbManager"
import { trySetupLocalEnv } from "../../../common/env";
import { HelpRequest, Organization, ProtectedUser, RequestPriority, RequestStatus, RequestTypeToLabelMap, User } from "../../../../../common/models";
import config from "../../../config";
import { mkdir, writeFile } from "fs/promises";
import { EnvironmentId } from "infra/src/environment";
import { enumVariants } from "infra/src/utils";
import { stringify } from 'csv-stringify';
import { OrganizationDoc } from "../../../models/organization";


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
            // only allow this for prod and testing on staging
            options: enumVariants(EnvironmentId).filter(v => v !== EnvironmentId[EnvironmentId.dev] && v !== EnvironmentId[EnvironmentId.preProd])
        }),
        stats: Flags.boolean()
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

            const basePath = flags.dir || flags.orgId;

            if (flags.stats) {
                await this.exportStats(org as Organization, requests, basePath)
            } else {
                await this.exportRaw(org as Organization, users, requests, basePath)
            }

            await dbManager.closeConnection()

        } catch (e) {
            this.logToStderr(e)
            this.exit(1)
        }
    }

    async exportRaw(org: Organization, users: ProtectedUser[], requests: HelpRequest[], basePath: string) {
        org.members = users.map(member => member.id) as any

        // make sure dir exists
        await mkdir(basePath, { recursive: true })

        const orgFilePath = `${basePath}/org.json`
        const reqFilePath = `${basePath}/requests.json`
        const userFilePath = `${basePath}/users.json`

        await writeFile(orgFilePath, JSON.stringify(org, null, 4))
        await writeFile(reqFilePath, JSON.stringify(requests, null, 4))
        await writeFile(userFilePath, JSON.stringify(users, null, 4))

        this.log(`Data exported to ${orgFilePath}, ${reqFilePath}, and ${userFilePath}`)
    }

    async exportStats(org: Organization, requests: HelpRequest[], basePath: string) {
        const headers = [
            'Request ID',
            'Crisis Types',
            'Tags',
            'Location',
            'Request Created At',
            'Call Start',
            'Call End',
            '1st "On The Way" Status',
            '1st "On Site" Status',
            '1st "Finished" Status',
            '1st "Archived" Status',
            'Priority'
        ];

        const rows = requests.map(req => {
            return [
                req.id,
                req.type.map(t => RequestTypeToLabelMap[t]).join(),
                req.tagHandles.map(handle => {
                    const cat = org.tagCategories.find(c => c.id == handle.categoryId)
                    const tag = cat.tags.find(t => t.id == handle.itemId)

                    return `${cat.name}::${tag.name}`
                }).sort().join(),
                req.location?.address || '',
                req.createdAt,
                req.callStartedAt,
                req.callEndedAt,
                req.statusEvents.find(e => e.status == RequestStatus.OnTheWay)?.setAt || '',
                req.statusEvents.find(e => e.status == RequestStatus.OnSite)?.setAt || '',
                req.statusEvents.find(e => e.status == RequestStatus.Done)?.setAt || '',
                req.statusEvents.find(e => e.status == RequestStatus.Closed)?.setAt || '',
                req.priority ? RequestPriority[req.priority] : ''
            ]
        })

        // make sure dir exists
        await mkdir(basePath, { recursive: true })

        const requestStatsPath = `${basePath}/request_data.csv`

        const csvData = await new Promise<string>((res, rej) => {
            stringify([
                headers,
                ...rows
            ], (err, output) => {
                if (err) {
                    rej(err)
                } else {
                    res(output)
                }
            })
        })

        await writeFile(requestStatsPath, csvData)

        this.log(`Data exported to ${requestStatsPath}`)
    }
}