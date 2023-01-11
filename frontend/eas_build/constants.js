const fs = require('fs');
const path = require('path');

// provided by build
exports.ENV = process.env._ENVIRONMENT
// only needed during build (provided by eas build env)
exports.PLATFORM = process.env.EAS_BUILD_PLATFORM
// running in eas build env
exports.inEASBuild = process.env.EAS_BUILD == 'true'
exports.inEASUpdate = !!process.env._UPDATE_ENVIRONMENT

// suffixes for differentiating env specific secrets in eas
// (they don't provide this natively le sigh)
exports.prodSecretSuffix = '_PROD'
exports.stagingSecretSuffix = '_STAGING'
exports.devSecretSuffix = '_DEV'

// base Env variable keys for secrets that ci/expo eas provide
exports.googleFCMKey = 'GOOGLE_FCM_CREDS'

// paths
exports.servicesJsonPath = path.resolve(__dirname, '..', 'google-services.json')