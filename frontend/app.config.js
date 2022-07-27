const dotenv = require('dotenv');

const ENV = process._ENVIRONMENT || 'local';

dotenv.config({ path: `../backend/env/.env.${ENV}` })

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
		"devUrl": "https://66c8-2601-3c1-c380-2680-1447-e337-549-d5d4.ngrok.io"
	  }
	}
}
  