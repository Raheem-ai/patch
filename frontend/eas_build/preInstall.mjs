import fs from 'fs';

import { 
	inEASBuild, 
    PLATFORM,
	ENV, 
	prodSecretSuffix, 
	stagingSecretSuffix, 
	devSecretSuffix,
    servicesJsonPath
} from './constants.js';

if (inEASBuild) {
    // https://github.com/yarnpkg/berry/issues/2701 workaround that breaks
    // eas build-pre-install script -__-

    if (PLATFORM == 'android') {
        let googleFCMKey = 'GOOGLE_FCM_CREDS'

        googleFCMKey += ENV == 'prod'
            ? prodSecretSuffix
            : ENV == 'staging'
                ? stagingSecretSuffix
                : ENV == 'dev'
                    ? devSecretSuffix
                    : '';


        const servicesJson = JSON.parse(process.env[googleFCMKey]).services_json

        fs.writeFileSync(servicesJsonPath, JSON.stringify(servicesJson));
    }
}

// TODO: add cloud message api token (https://console.firebase.google.com/u/1/project/raheem-org/settings/cloudmessaging/android:ai.raheem.patch)
// to https://expo.dev/accounts/raheem-ai/projects/patch/credentials?platform=android 
// once we have created a first prod android build