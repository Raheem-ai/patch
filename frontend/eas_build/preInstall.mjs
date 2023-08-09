import fs from 'fs';

import { 
	inEASBuild, 
    inEASUpdate,
    PLATFORM,
	ENV, 
	prodSecretSuffix, 
	stagingSecretSuffix, 
	devSecretSuffix,
    servicesJsonPath,
    googleFCMKey
} from './constants.js';


if (inEASBuild) {
    // https://github.com/yarnpkg/berry/issues/2701 workaround that breaks
    // eas build-pre-install script -__-

    if (PLATFORM == 'android') {
        let key = googleFCMKey;

        key += (ENV == 'prod' || ENV == 'preprod')
            ? prodSecretSuffix
            : ENV == 'staging'
                ? stagingSecretSuffix
                : ENV == 'dev'
                    ? devSecretSuffix
                    : '';


        const servicesJson = JSON.parse(process.env[key]).services_json

        fs.writeFileSync(servicesJsonPath, JSON.stringify(servicesJson));
    }
} else if (inEASUpdate) { // ci or locally

    // TODO: do setup for locally

    console.log('inEASUpdate: ')

    const servicesJson = JSON.parse(process.env[googleFCMKey]).services_json

    fs.writeFileSync(servicesJsonPath, JSON.stringify(servicesJson));
}

// TODO: add cloud message api token (https://console.firebase.google.com/u/1/project/raheem-org/settings/cloudmessaging/android:ai.raheem.patch)
// to https://expo.dev/accounts/raheem-ai/projects/patch/credentials?platform=android 
// once we have created a first prod android build