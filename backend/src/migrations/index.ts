import { mongoMigrateCli } from 'mongo-migrate-ts';
import config from '../config';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// provided by (build/local) runner
const ENV = process.env._ENVIRONMENT 
// TODO: it would be nice for this to be able to live in common 
// as the frontend app.config.js uses this same logic buttt I tried it and
// common can't resolve node_module dependencies as this would have to be written
// in js...can't write in ts and have build place it in frontend/backend because
// frontend app.config.js has no build step
function loadLocalEnv(env) {
	const envConfigPath = path.resolve(__dirname, `../../../../../backend/env/.env.${env}`) 
	
	if (!fs.existsSync(envConfigPath)) {
		throw `Missing essential env variables and there is no .env file at ${envConfigPath}`
	}

	dotenv.config({ path: envConfigPath })
}

function loadBuildEnv() {
	const envConfigPath = process.env.BUILD_CONFIG_FILE // prod
		|| '/workspace/build_config.env' // staging
	
	if (!fs.existsSync(envConfigPath)) {
		throw `Missing essential env variables and there is no .env file at ${envConfigPath}`
	}

	dotenv.config({ path: envConfigPath })
}

if (!ENV) {
	loadLocalEnv(`local`)
} else if (ENV == 'prod') {
	if (!process.env.MONGO_CREDS) {
		loadLocalEnv(`prod`)
	}
} else {
	if (!process.env.MONGO_CREDS) {
		loadLocalEnv(`staging`)
	}
}

if (!process.env.MONGO) {
	// in cloud build after container has been built so need to load config from 'build_config.env'
	loadBuildEnv()
}

const mongoConnectionString = config.MONGO_CONNECTION_STRING.get().connection_string;

mongoMigrateCli({
  uri: mongoConnectionString,
  migrationsDir: __dirname,
  migrationsCollection: 'migrations_collection',
});