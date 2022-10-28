const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// NOTE: put your ngrok url here for development
let apiHost = ''
// increment every time you do a build you're going to submit a new release 
const RELEASE_NUMBER = '0.0.8'
// increment this any time you want to submit a new release to the play store
const BUILD_COUNT = 3

// provided by build
const ENV = process.env._ENVIRONMENT 
// provided by local runner
const DEV_ENV = process.env._DEV_ENVIRONMENT 
// only needed during build (provided by eas build env)
// const PLATFORM = process.env.EAS_BUILD_PLATFORM
// running in eas build env
const inEASBuild = process.env.EAS_BUILD == 'true';

/**
 * ONLY NEEDED FOR BUILD TIME
 * ie. publish will have this be blank in the manifest and that's okay
 * For Apple:
 * - corresponds to "CFBundleShortVersionString"
 * 
 * For Android: 
 * - corresponds to "versionName"
 */
 let VERSION = RELEASE_NUMBER

// just signifies if a build of a particular version is for prod/staging and ios/android of that version
// and these values will throw if we are doing a real build without passing in the required env variables
let IOS_BUILD_NUMBER = '1'
// let IOS_BUILD_NUMBER = '-1'
let ANDROID_VERSION_CODE = BUILD_COUNT
// let ANDROID_VERSION_CODE = -1

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

function resolveVersionInfo(env) {
	if (env == 'prod') {
		// ANDROID_VERSION_CODE = ((BUILD_COUNT - 1) * 2) + 1
		// VERSION = RELEASE_NUMBER
		// IOS_BUILD_NUMBER = '1'
	} else if (env == 'staging') {
		// ANDROID_VERSION_CODE = ((BUILD_COUNT - 1) * 2)
		// IOS_BUILD_NUMBER = '0.0.1'

		// if (PLATFORM == 'ios') {
		// 	VERSION = RELEASE_NUMBER
		// } else if (PLATFORM == 'android') {
		// 	VERSION = `${RELEASE_NUMBER}-staging`
		// }
		// VERSION = RELEASE_NUMBER
	}
}

function resolveSecrets(env) {
	const prodSecretSuffix = '_PROD'
	const stagingSecretSuffix = '_STAGING'

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

	// set correction versioning info
	resolveVersionInfo(ENV)

	resolveSecrets(ENV)

} else if (!!DEV_ENV) { // running expo start locally against an env

	// load env variables for target env from .env files
	loadLocalEnv(DEV_ENV)

	// make sure api is pointing to the right environment
	resolveApiHost(DEV_ENV)

	resolveSecrets(DEV_ENV)

} else {
	// running eas update locally or otherwise
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
	return !!DEV_ENV 
		? 'dev'
		: ENV
}

function backendEnv() {
	return ENV || DEV_ENV
}

function branchConfig() {
	const env = appEnv();

	return {
		// have to set this to a fake value so we can send the build to eas
		// as it is used in a config plugin which apparently does it's validation 
		// before being on the build server -_-...real value gets set in the build
		"apiKey": BRANCH_KEY || 'FAKE',
		"iosAppDomain": env == 'prod'
			? "hla1z.app.link"
			: "hla1z.test-app.link"
	}
}

const config = {
	"expo": {
	  "name": appName(),
	  "slug": "patch",
	  "owner": "raheem-ai",
	  "version": VERSION,
	  "orientation": "portrait",
	  "icon": "./assets/icon.png",
	  "scheme": "raheem",
	  "splash": {
		"image": "./assets/splash.png",
		"resizeMode": "contain",
		"backgroundColor": "#ffffff"
	  },
	  "plugins": [
	  	"sentry-expo",
		[
			"@config-plugins/react-native-branch",
			branchConfig()
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
		"versionCode": ANDROID_VERSION_CODE,
		"adaptiveIcon": {
		  "foregroundImage": "./assets/adaptive-icon.png",
		  "backgroundColor": "#FFFFFF"
		},
		"package": appId(),
		"permissions": [],
		"config": {
		  "googleMaps": { 
			"apiKey": GOOGLE_MAPS_KEY
		  }
		}
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
		"linkBaseUrl": branchConfig().iosAppDomain
	  },
	  "runtimeVersion": {
		"policy": "nativeVersion"
	  },
	  "updates": {
		"url": "https://u.expo.dev/ae020710-1c9f-46da-9651-9003dc40fc83"
	  }
	}
}

export default config