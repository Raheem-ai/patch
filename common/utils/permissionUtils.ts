import { PatchPermissions, Role, PatchPermissionGroups, PermissionGroupMetadata } from '../models'
 
export function resolvePermissionsFromPermissionGroups(groups: PatchPermissionGroups[], userPermissions?: Set<PatchPermissions>) {
    const setOfPermissions = userPermissions || new Set();
    
    for (const group of groups) {
        (PermissionGroupMetadata[group]?.permissions || []).forEach(permission => {
            setOfPermissions.add(permission);
        });

        resolvePermissionsFromPermissionGroups(PermissionGroupMetadata[group]?.forces || [], setOfPermissions)
    }
}

export function resolvePermissionsFromRoles(roles: Role[]): Set<PatchPermissions> {
    const userPermissions = new Set<PatchPermissions>();

    for (const role of roles) {
        resolvePermissionsFromPermissionGroups(role.permissionGroups, userPermissions)
    }

    return userPermissions;
}

export function resolvePermissionGroups(selectedGroups: PatchPermissionGroups[], visuallySelectedGroups?: Set<PatchPermissionGroups>) {
    const setOfGroups = visuallySelectedGroups || new Set();
    
    for (const group of selectedGroups) {
        setOfGroups.add(group);
        resolvePermissionGroups(PermissionGroupMetadata[group]?.forces || [], setOfGroups)
    }

    return setOfGroups
}