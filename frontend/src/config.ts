import Constants from 'expo-constants'

export const apiHost = Constants.manifest2?.extra.expoClient.extra.apiHost;
export const sentryDSN = Constants.manifest2?.extra.expoClient.extra.sentryDSN;
export const appEnv = Constants.manifest2?.extra.expoClient.extra.appEnv;
export const backendEnv = Constants.manifest2?.extra.expoClient.extra.backendEnv;
export const linkBaseUrl = Constants.manifest2?.extra.expoClient.extra.linkBaseUrl;

export const inProdApp = appEnv == 'prod'
export const inStagingApp = appEnv == 'staging'
export const inDevApp = appEnv == 'dev'