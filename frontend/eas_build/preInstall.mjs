import fs from 'fs';

import { 
	inEASBuild, 
    inEASUpdate,
    PLATFORM,
	ENV, 
	prodSecretSuffix, 
    preProdSecretSuffix,
	stagingSecretSuffix, 
	devSecretSuffix,
    servicesJsonPath,
    googleFCMKey
} from './constants.js';


if (inEASBuild) {
    // https://github.com/yarnpkg/berry/issues/2701 workaround that breaks
    // eas build-pre-install script -__-

    // NOTE: these only live in expo's secrets
    // TODO: figure out where to track these more clearly
    if (PLATFORM == 'android') {
        let key = googleFCMKey;

        key += ENV == 'prod'
            ? prodSecretSuffix
            : ENV == 'preprod'
                ? preProdSecretSuffix
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
    const UPDATE_ENV = process.env._UPDATE_ENVIRONMENT

    let key = googleFCMKey;

    // NOTE: These secrets live in GCP in the secret store NOT expo like the build ones above
    // TODO: have a way to confirm these are in sync with eachother with GCP being the SSOT

    // staging is the only environment that needs this secret 
    // in the non-prod GCP project so it doesn't need to differentieate
    // prod/preprod have different app identifiers but also live in the same GCP project
    key += UPDATE_ENV == 'prod'
        ? prodSecretSuffix
        : UPDATE_ENV == 'preprod'
            ? preProdSecretSuffix
            : '';

    const servicesJson = JSON.parse(process.env[key]).services_json

    fs.writeFileSync(servicesJsonPath, JSON.stringify(servicesJson));
}

// TODO: add cloud message api token (https://console.firebase.google.com/u/1/project/raheem-org/settings/cloudmessaging/android:ai.raheem.patch)
// to https://expo.dev/accounts/raheem-ai/projects/patch/credentials?platform=android 
// once we have created a first prod android build