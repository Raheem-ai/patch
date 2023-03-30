require('module-alias/register');

import { DBManager } from "../common/dbManager"
import { trySetupLocalEnv } from "../common/env";
import config from "../config";

trySetupLocalEnv()

async function main() {
    const connString = config.MONGO_CONNECTION_STRING.get().connection_string;

    const dbManager = await DBManager.fromConnectionString(connString);

    console.log(await dbManager.getUser({ email: 'Charlie@test.com' }))
}

main().then(_ => console.log('done')).catch(console.error)