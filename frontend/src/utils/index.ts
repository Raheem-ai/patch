import { releaseChannel } from "expo-updates";
import { PatchPermissions } from "../../../common/models";
import { organizationStore, userStore } from "../stores/interfaces";

export const runningOnProd = releaseChannel == 'prod';
export const runningOnStaging = releaseChannel == 'staging';
export const runningOnDev = releaseChannel == 'default';


export function userHasAllPermissions(userId: string, targetPermissions: PatchPermissions[]) : boolean {    
    if (organizationStore().userPermissions.has(userId)) {
        const usersPermissions = organizationStore().userPermissions.get(userId);

        return targetPermissions.every(p => usersPermissions.has(p))
    } else {
        return false
    }    
}

export function userHasAnyPermissions(userId: string, targetPermissions: PatchPermissions[]) : boolean {    
    if (organizationStore().userPermissions.has(userId)) {
        const usersPermissions = organizationStore().userPermissions.get(userId);

        return !targetPermissions.every(p => !usersPermissions.has(p))
    } else {
        return false
    }    
}

export function iHaveAllPermissions(targetPermissions: PatchPermissions[]) : boolean {    
    const myId = userStore().user.id;
    return userHasAllPermissions(myId, targetPermissions)
}

export function iHaveAnyPermissions(targetPermissions: PatchPermissions[]) : boolean {    
    const myId = userStore().user.id;
    return userHasAnyPermissions(myId, targetPermissions)
}