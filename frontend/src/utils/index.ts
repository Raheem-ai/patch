import { releaseChannel } from "expo-updates";
import { PatchPermissions } from "../../../common/models";
import { organizationStore } from "../stores/interfaces";

export const runningOnProd = releaseChannel == 'prod';
export const runningOnStaging = releaseChannel == 'staging';
export const runningOnDev = releaseChannel == 'default';


export function userHasPermissions(userId: string, targetPermissions: PatchPermissions[]) : boolean {    
    if (organizationStore().userPermissions.has(userId)) {
        const usersPermissions = organizationStore().userPermissions.get(userId);

        return targetPermissions.every(p => usersPermissions.has(p))
    } else {
        return false
    }    
}