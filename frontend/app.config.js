const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// NOTE: put your ngrok url here for development
let apiHost = ''
// increment every time you do a build you're going to submit a new release 
const RELEASE_NUMBER = '0.0.7'
// increment this any time you want to submit a new release to the play store
const BUILD_COUNT = 3

// provided by (build/local) runner
const ENV = process.env._ENVIRONMENT 
// only needed during build
const PLATFORM = process.env._PLATFORM

/**
 * ONLY NEEDED FOR BUILD TIME
 * ie. publish will have this be blank in the manifest and that's okay
 * For Apple:
 * - corresponds to "CFBundleShortVersionString"
 * 
 * For Android: 
 * - corresponds to "versionName"
 */
 let VERSION = ''

// just signifies if a build of a particular version is for prod/staging and ios/android of that version
// and these values will throw if we are doing a real build without passing in the required env variables
 let IOS_BUILD_NUMBER = '-1'
 let ANDROID_VERSION_CODE = -1

function loadLocalEnv(env) {
	const envConfigPath = path.resolve(__dirname, `../backend/env/.env.${env}`) 
	
	if (!fs.existsSync(envConfigPath)) {
		throw `Missing essential env variables and there is no .env file at ${envConfigPath}`
	}

	dotenv.config({ path: envConfigPath })
}

// TODO: urls should come from config not here
// if not in build then must be local
if (!ENV) {
	loadLocalEnv(`local`)
} else if (ENV == 'prod') {
	// in case we run this locally (to build or for frontend dev)
	if (!process.env.GOOGLE_MAPS) {
		loadLocalEnv(`prod`)
	}

	apiHost = 'https://patch-api-wiwa2devva-uc.a.run.app'

	ANDROID_VERSION_CODE = ((BUILD_COUNT - 1) * 2) + 1
	VERSION = RELEASE_NUMBER
	IOS_BUILD_NUMBER = '1'
} else {
	// in case we run this locally (to build or for frontend dev)
	if (!process.env.GOOGLE_MAPS) {
		loadLocalEnv(`staging`)
	}

	// default to staging
	apiHost = 'https://patch-api-staging-y4ftc4poeq-uc.a.run.app'

	ANDROID_VERSION_CODE = ((BUILD_COUNT - 1) * 2)
	IOS_BUILD_NUMBER = '0.0.1'

	if (PLATFORM == 'ios') {
		VERSION = RELEASE_NUMBER
	} else if (PLATFORM == 'android') {
		VERSION = `${RELEASE_NUMBER}-staging`
	}
}

// NOTE:
// every secret that goes here needs to be added to the build def as
// this is build time vs runtime...which means we need to build for EACH environment
// *** we have no way of accessing config here (vs secrets)***
// TODO: figure out how to get config here
const googleMapsKey = JSON.parse(process.env.GOOGLE_MAPS).api_key
const sentrySecrets = JSON.parse(process.env.SENTRY_CREDS)

const config = {
	"expo": {
	  "name": "patch",
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
	  // TODO: add if/when we move to eas build
	  //   "plugins": [
	  // 	"sentry-expo"
	  //   ]
	  "hooks": {
		"postPublish": [
		  {
			"file": "sentry-expo/upload-sourcemaps",
			"config": {
			  "organization": "raheem-org",
			  "project": "patch",
			  "authToken": sentrySecrets.auth_token
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
		"bundleIdentifier": "ai.raheem.patch",
		"config": {
		  "googleMapsApiKey": googleMapsKey
		}
	  },
	  "android": {
		"versionCode": ANDROID_VERSION_CODE,
		"adaptiveIcon": {
		  "foregroundImage": "./assets/adaptive-icon.png",
		  "backgroundColor": "#FFFFFF"
		},
		"package": "ai.raheem.patch",
		"permissions": [],
		"config": {
		  "googleMaps": { 
			"apiKey": googleMapsKey
		  }
		}
	  },
	  "web": {
		"favicon": "./assets/favicon.png"
	  },
	  "extra": {
		"apiHost": apiHost,
		"sentryDSN": sentrySecrets.dsn
	  }
	}
}

export default config