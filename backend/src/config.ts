require('module-alias/register');

import config, { 
    PatchMongoDBConfig,
    RaheemConfig, RedisConfig 
} from 'infra/src/config';

import {
    ExpoCredentials,
    PatchMongoDBCredentials,
    PatchSessionSecret,
    PatchTwilioSecret
} from 'infra/src/secrets';
import { ConfigInstance } from '../infra/src/config/configurable';

const environmentConfig = {
    RAHEEM: new RaheemConfig(),
    SESSION: new PatchSessionSecret(),
    MONGO: new PatchMongoDBConfig(),
    MONGO_CREDS: new PatchMongoDBCredentials(),
    EXPO: new ExpoCredentials(),
    TWILIO: new PatchTwilioSecret(),
    REDIS: new RedisConfig()
}

// can formalize this pattern in the future to make it more reusable
// ie. different mongo creds pointing to the same db resource
const dynamicEnvironmentConfig = {
    MONGO_CONNECTION_STRING: (config: ConfigInstance<typeof environmentConfig>) => {
        const creds = config.MONGO_CREDS.get();
        const db = config.MONGO.get();

        return {
            connection_string: `mongodb+srv://${creds.username}:${creds.password}@${db.host}/${db.database}?retryWrites=true&w=majority`
        }
    }
}

export { environmentConfig };

export default config(environmentConfig, dynamicEnvironmentConfig);