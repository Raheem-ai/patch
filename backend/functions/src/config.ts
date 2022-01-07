require('module-alias/register');

import config, { 
    RaheemConfig, RedisConfig 
} from 'infra/src/config';

import {
    ExpoCredentials,
    PatchMongoDBCredentials,
    PatchSessionSecret,
    PatchTwilioSecret
} from 'infra/src/secrets';

const environmentConfig = {
    RAHEEM: new RaheemConfig(),
    SESSION: new PatchSessionSecret(),
    MONGO: new PatchMongoDBCredentials(),
    EXPO: new ExpoCredentials(),
    TWILIO: new PatchTwilioSecret(),
    REDIS: new RedisConfig()
}

export { environmentConfig };

export default config(environmentConfig);