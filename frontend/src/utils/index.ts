import { releaseChannel } from "expo-updates";
import { PatchPermissions } from "../../../common/models";
import { organizationStore, userStore } from "../stores/interfaces";

export const runningOnProd = releaseChannel == 'prod';
export const runningOnStaging = releaseChannel == 'staging';
export const runningOnDev = releaseChannel == 'default';

export function validateMappings(
    itemMappings: [{ id: symbol }, new () => any][],
    allItems: { id: symbol }[],
    itemTypeName: string
) {
    const mappingSet = new Set<Symbol>(itemMappings.map(([val, _]) => val.id));
    const allItemSet = new Set<Symbol>(allItems.map((item) => item.id));

    const mappingDiff = new Set<Symbol>([...mappingSet].filter(s => !allItemSet.has(s)));
    const allItemDiff = new Set<Symbol>([...allItemSet].filter(s => !mappingSet.has(s)));

    let errorMsg = '';

    if (mappingDiff.size) {
        errorMsg += `\n${itemTypeName}(s) "${Array.from(mappingDiff.values()).map(s => s.toString()).join(', ')}" are in the startup mapping but not in the All${itemTypeName}s array`
    }

    if (allItemDiff.size) {
        errorMsg += `\n${itemTypeName}(s) "${Array.from(allItemDiff.values()).map(s => s.toString()).join(', ')}" are in the All${itemTypeName}s array but not in the startup mapping`
    } 

    if (errorMsg) {
        throw errorMsg
    }
}


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