require('module-alias/register');

import config, { 
    RaheemConfig 
} from 'infra/src/config';

import {
    ExpoCredentials,
    PatchMongoDBCredentials,
    PatchSessionSecret
} from 'infra/src/secrets';

const environmentConfig = {
    RAHEEM: new RaheemConfig(),
    SESSION: new PatchSessionSecret(),
    MONGO: new PatchMongoDBCredentials(),
    EXPO: new ExpoCredentials()
}

export { environmentConfig };

export default config(environmentConfig);