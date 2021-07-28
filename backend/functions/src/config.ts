require('module-alias/register');

import config, { 
    RaheemConfig 
} from 'infra/src/config';

import {
    PatchMongoDBCredentials,
    PatchSessionSecret
} from 'infra/src/secrets';

const environmentConfig = {
    RAHEEM: new RaheemConfig(),
    SESSION: new PatchSessionSecret(),
    MONGO: new PatchMongoDBCredentials()
}

export { environmentConfig };

export default config(environmentConfig);