const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// NOTE:
// every secret that goes here needs to be added to the build def as
// this is build time vs runtime...which means we need to build for EACH environment

// provided by build
const ENV = process.env._ENVIRONMENT 

// NOTE: put your ngrok url here for development
let apiHost = ''

// just signifies if a build of a particular version is for prod or staging of that version
// and these values will throw if we are doing a real build
let iosBuildEnvFlag = "-1";
let androidBuildEnvFlag = -1;

function loadLocalEnv(env) {
	const envConfigPath = path.resolve(__dirname, `../backend/env/.env.${env}`) 
	
	if (!fs.existsSync(envConfigPath)) {
		throw `Missing essential env variables and there is no .env file at ${envConfigPath}`
	}

	dotenv.config({ path: envConfigPath })
}

// TODO: this should come from config not here
// if not in build then must be local
if (!ENV) {
	loadLocalEnv(`local`)
} else if (ENV == 'prod') {
	// in case we run this locally
	if (!process.env.GOOGLE_MAPS) {
		loadLocalEnv(`prod`)
	}

	apiHost = 'https://patch-api-wiwa2devva-uc.a.run.app'
	iosBuildEnvFlag = "1"
	androidBuildEnvFlag = 1
} else {
	// in case we run this locally
	if (!process.env.GOOGLE_MAPS) {
		loadLocalEnv(`staging`)
	}

	// default to staging
	apiHost = 'https://patch-api-staging-y4ftc4poeq-uc.a.run.app'
	iosBuildEnvFlag = "0.0.1"
	androidBuildEnvFlag = 2
}

const googleMapsKey = JSON.parse(process.env.GOOGLE_MAPS).api_key

export default {
	"expo": {
	  "name": "patch",
	  "slug": "patch",
	  "owner": "raheem-ai",
	  "version": "0.0.5",
	  "orientation": "portrait",
	  "icon": "./assets/icon.png",
	  "scheme": "raheem",
	  "splash": {
		"image": "./assets/splash.png",
		"resizeMode": "contain",
		"backgroundColor": "#ffffff"
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
		"buildNumber": iosBuildEnvFlag,
		"bundleIdentifier": "ai.raheem.patch",
		"config": {
		  "googleMapsApiKey": googleMapsKey
		}
	  },
	  "android": {
		"versionCode": androidBuildEnvFlag,
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
		"apiHost": apiHost
	  }
	}
}
  