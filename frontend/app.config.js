const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

import { 
	inEASBuild, 
	ENV, 
	prodSecretSuffix, 
	stagingSecretSuffix, 
	devSecretSuffix,
	servicesJsonPath
} from './eas_build/constants';

// NOTE: put your ngrok url here for development
let apiHost = ''

/**
 * ONLY NEEDED FOR BUILD TIME
 * ie. publish will have this be blank in the manifest and that's okay
 * For Apple:
 * - corresponds to "CFBundleShortVersionString"
 * 
 * For Android: 
 * - corresponds to "versionName"
 * 
 * NOTE: increment every time you make a change that requires
 * a new build because of native code changes or build time native 
 * config changes
 */
const VERSION = `1.0.1`
// NOTE: this needs to be a positive integer that gets incremented along side VERSION
let ANDROID_VERSION_CODE = 12
// provided by local runner
const DEV_ENV = process.env._DEV_ENVIRONMENT 
// provided by whatever script is running update
const UPDATE_ENVIRONMENT = process.env._UPDATE_ENVIRONMENT

// this value shouldn't need to change 
let IOS_BUILD_NUMBER = "1"


let SENTRY_AUTH_TOKEN = ''
let SENTRY_DSN = ''
let GOOGLE_MAPS_KEY = ''
let BRANCH_KEY = ''

function loadLocalEnv(env) {
	const envConfigPath = path.resolve(__dirname, `../backend/env/.env.${env}`) 
	
	if (!fs.existsSync(envConfigPath)) {
		throw `Missing essential env variables and there is no .env file at ${envConfigPath}`
	}

	dotenv.config({ path: envConfigPath })
}

function resolveApiHost(env) {
	const prodApiHost = 'https://patch-api-wiwa2devva-uc.a.run.app'
	const stagingApiHost = 'https://patch-api-staging-y4ftc4poeq-uc.a.run.app'

	apiHost = env == 'staging'
		? stagingApiHost
		: env == 'prod'
			? prodApiHost
			: apiHost || stagingApiHost // for dev let defined local url override but fallback to staging
}

function resolveSecrets(env) {
	let googleMapsKey = 'GOOGLE_MAPS'
	let sentryKey = 'SENTRY_CREDS'
	let branchKey = 'BRANCH_CREDS'

	// secrets in eas build 
	if (inEASBuild && env == 'prod') {
		googleMapsKey += prodSecretSuffix
		sentryKey += prodSecretSuffix
		branchKey += prodSecretSuffix
	} else if (inEASBuild 
		&& (env == 'staging' || env == 'dev') // dev & staging use the same secrets for now
	) {
		googleMapsKey += stagingSecretSuffix
		sentryKey += stagingSecretSuffix
		branchKey += stagingSecretSuffix
	}

	// NOTE:
	// every secret that goes here needs to be added to the build def as
	// this is build time vs runtime...which means we need to build for EACH environment
	// *** we have no way of accessing config here (vs secrets)***
	// TODO: figure out how to get config here
	GOOGLE_MAPS_KEY = JSON.parse(process.env[googleMapsKey]).api_key

	BRANCH_KEY = JSON.parse(process.env[branchKey]).key

	const sentrySecrets = JSON.parse(process.env[sentryKey])
	
	SENTRY_AUTH_TOKEN = sentrySecrets.auth_token
	SENTRY_DSN = sentrySecrets.dsn
}

if (inEASBuild) { // running eas build on ci server
	if (!ENV) {
		throw 'Missing _ENVIRONMENT env variable'
	}
	
	// make sure api is pointing to the right environment
	resolveApiHost(ENV)

	resolveSecrets(ENV)

} else if (!!DEV_ENV) { // running expo start locally against an env

	// load env variables for target env from .env files
	loadLocalEnv(DEV_ENV)

	// make sure api is pointing to the right environment
	resolveApiHost(DEV_ENV)

	resolveSecrets(DEV_ENV)

} else if (!!UPDATE_ENVIRONMENT) {
	// running eas update locally or otherwise

	// try and load secrets from local .env files if they exist
	try {
		loadLocalEnv(UPDATE_ENVIRONMENT)
	} catch (e) {

	}
	
	// make sure api is pointing to the right environment
	resolveApiHost(UPDATE_ENVIRONMENT)

	// resolve secrets either pulled from local .env
	// or provided by env
	resolveSecrets(UPDATE_ENVIRONMENT)
} else {
	// throw `This file shouldn't be used without providing either _ENVIRONMENT, _DEV_ENVIRONMENT, or _UPDATE_ENV env variable`
}

// the name that shows up under the app icon 
// on a phone
function appName() {
	const env = appEnv()

	return env == 'prod'
		? 'patch'
		: env == 'staging'
			? 'patch (staging)'
			: 'patch (dev)'
}

function appId() {
	const env = appEnv()

	return env == 'prod'
		? 'ai.raheem.patch'
		: env == 'staging'
			? 'ai.raheem.patch.staging'
			: 'ai.raheem.patch.dev'
}

function appEnv() {
	return UPDATE_ENVIRONMENT || (!!DEV_ENV 
		? 'dev'
		: ENV)
}

function backendEnv() {
	return UPDATE_ENVIRONMENT || ENV || DEV_ENV
}

function scheme() {
	const env = appEnv();

	return 'raheem';
	// TODO: test this on dev/staging first
	// return env == 'prod'
	// 	? 'raheem'
	// 	: `raheem-${env}`
}

function branchConfig() {
	const env = appEnv();

	return {
		// have to set this to a fake value so we can send the build to eas
		// as it is used in a config plugin which apparently does it's validation 
		// before being on the build server -_-...real value gets set in the build
		"apiKey": BRANCH_KEY || 'FAKE',
		"appDomain": env == 'prod'
			? "hla1z.app.link"
			: "hla1z.test-app.link",
		"exhaustiveAppDomains": env == 'prod'
			? ["hla1z.app.link", "hla1z-alternate.app.link"]
			: ["hla1z.test-app.link", "hla1z-alternate.test-app.link"]
	}
}

function termsOfServiceVersion() {
	return `v1_1_17_23`
}

function termsOfServiceLink() {
	return 'https://getpatch.org/terms/'
}

const config = {
	"expo": {
	  "name": appName(),
	  "slug": "patch",
	  "owner": "raheem-ai",
	  "version": VERSION,
	  "orientation": "portrait",
	  "icon": "./assets/patch_default_logo.png",
	  "scheme": scheme(),
	  "splash": {
		"image": "./assets/splash.png",
		"resizeMode": "cover",
		"backgroundColor": "#ffffff"
	  },
	  "plugins": [
	  	"sentry-expo",
		[
			"@config-plugins/react-native-branch",
			branchConfig()
		],
		[
			"expo-screen-orientation",
			{
			  "initialOrientation": "PORTRAIT_UP"
			}
		]
		//  TODO: reenable if we want custom notification icon/sounds
		// [
		// 	"expo-notifications",
		// 	{
		// 		"icon": "./local/assets/notification-icon.png",
		// 		"color": "#ffffff",
		// 		"sounds": [
		// 		"./local/assets/notification-sound.wav",
		// 		"./local/assets/notification-sound-other.wav"
		// 		]
		// 	}
		// ]
	  ],
	  "hooks": {
		"postPublish": [
		  {
			"file": "sentry-expo/upload-sourcemaps",
			"config": {
			  "organization": "raheem-org",
			  "project": "patch",
			  "authToken": SENTRY_AUTH_TOKEN
			}
		  }
		]
	  },
	  "updates": {
		"fallbackToCacheTimeout": 0
	  },
	  "assetBundlePatterns": [
		"**/*"
	  ],
	  "ios": {
		"supportsTablet": true,
		"infoPlist": {
		  "NSLocationAlwaysUsageDescription": "testing",
		  "UIBackgroundModes": [
			"location",
			"fetch",
			"remote-notification"
		  ]
		},
		"buildNumber": IOS_BUILD_NUMBER,
		"bundleIdentifier": appId(),
		"config": {
		  "googleMapsApiKey": GOOGLE_MAPS_KEY
		}
	  },
	  "android": {
		"icon": "./assets/patch_default_logo.png",
		"googleServicesFile": servicesJsonPath,
		"versionCode": ANDROID_VERSION_CODE,
		"adaptiveIcon": {
		  "foregroundImage": "./assets/patch_adaptive_logo_foreground.png",
		  "backgroundImage": "./assets/patch_adaptive_logo_background.png"
		},
		"package": appId(),
		"permissions": [],
		"config": {
		  "googleMaps": { 
			"apiKey": GOOGLE_MAPS_KEY
		  }
		},
		"intentFilters": [
			{
			  "action": "VIEW",
			  "autoVerify": true,
			  "data": branchConfig().exhaustiveAppDomains.map(domain => {
				return {
					"scheme": "https",
					"host": domain,
				}
			}),
			  "category": ["DEFAULT", "BROWSABLE"]
			}
		]
	  },
	  "androidStatusBar": {
		"barStyle": "light-content",
		"translucent": true
	  },
	  "web": {
		"favicon": "./assets/favicon.png"
	  },
	  "extra": {
		"eas": {
			"projectId": "ae020710-1c9f-46da-9651-9003dc40fc83"
		},
		"apiHost": apiHost,
		"sentryDSN": SENTRY_DSN,
		"appEnv": appEnv(),
		"backendEnv": backendEnv(),
		"linkBaseUrl": branchConfig().appDomain,
		"termsOfServiceVersion": termsOfServiceVersion(),
		"termsOfServiceLink": termsOfServiceLink()
	  },
	  "runtimeVersion": {
		"policy": "nativeVersion"
	  },
	  "updates": {
		"url": "https://u.expo.dev/ae020710-1c9f-46da-9651-9003dc40fc83"
	  }
	}
}

// console.log(config)

export default config