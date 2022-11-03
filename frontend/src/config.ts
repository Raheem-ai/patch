import Constants from 'expo-constants'

const extra = Constants.manifest?.extra // build with no updates yet
    || Constants.manifest2?.extra.expoClient.extra; // once first update is deployed

export const apiHost = extra.apiHost;
export const sentryDSN = extra.sentryDSN;
export const appEnv = extra.appEnv;
export const backendEnv = extra.backendEnv;
export const linkBaseUrl = extra.linkBaseUrl;

export const inProdApp = appEnv == 'prod'
export const inStagingApp = appEnv == 'staging'
export const inDevApp = appEnv == 'dev'