import Constants from 'expo-constants'
import * as Updates from 'expo-updates';

/**
 * TODO: more tightly define what should be defined
 * - in app.config.js (build time config tied to apps nativeVersion)
 * - here (runtime config tied to specific deployment of apps nativeVersion) 
 * - dynamicConfig (runtime config that always reflects db but has to be loaded on startup)
 * 
 * also, should dynamicConfig be something that is publicly accessable?...otherwise we can only surface it AFTER signing in
 * */ 

const extra = Constants.manifest?.extra // build with no updates yet
    || Constants.manifest2?.extra.expoClient.extra; // once first update is deployed

export const apiHost = extra.apiHost;
export const sentryDSN = extra.sentryDSN;
export const appEnv = extra.appEnv;
export const backendEnv = extra.backendEnv;

export const linkBaseUrl = extra.linkBaseUrl;
export const termsOfServiceVersion = extra.termsOfServiceVersion;
export const termsOfServiceLink = extra.termsOfServiceLink;

export const appRuntimeVersion = Updates.runtimeVersion;

export const inProdApp = appEnv == 'prod'
export const inPreProdApp = appEnv == 'preprod'
export const inStagingApp = appEnv == 'staging'
export const inDevApp = appEnv == 'dev'

export const iosAppStoreURL = 'https://apps.apple.com/us/app/patch-mobile-crisis-response/id1592219338'
export const androidAppStoreURL = 'https://play.google.com/store/apps/details?id=ai.raheem.patch'