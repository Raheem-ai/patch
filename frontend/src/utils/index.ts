import { releaseChannel } from "expo-updates";

export const runningOnProd = releaseChannel == 'prod';
export const runningOnStaging = releaseChannel == 'staging';
export const runningOnDev = releaseChannel == 'default';
