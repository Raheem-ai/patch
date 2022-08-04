const dotenv = require('dotenv');

// NOTE:
// every secret that goes here needs to be added to the build def as
// this is build time vs runtime...which means we need to build for EACH environment

// provided by build
const ENV = process._ENVIRONMENT 

// NOTE: put your ngrok url here for development
let apiHost = ''

// TODO: this should come from config not here
// if not in build then must be local
if (!ENV) {
	dotenv.config({ path: `../backend/env/.env.local` })
} else if (ENV == 'prod') {
	apiHost = 'https://patch-api-wiwa2devva-uc.a.run.app'
} else {
	// default to staging
	apiHost = 'https://patch-api-staging-y4ftc4poeq-uc.a.run.app'
}

const googleMapsKey = JSON.parse(process.env.GOOGLE_MAPS).api_key

export default {
	"expo": {
	  "name": "patch",
	  "slug": "patch",
	  "owner": "raheem-ai",
	  "version": "0.0.4",
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
		"buildNumber": "0.0.1",
		"bundleIdentifier": "ai.raheem.patch",
		"config": {
		  "googleMapsApiKey": googleMapsKey
		}
	  },
	  "android": {
		"versionCode": 3,
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
  