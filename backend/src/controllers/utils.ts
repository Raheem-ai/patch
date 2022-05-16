import { Forbidden } from "@tsed/exceptions";
import { PatchPermissionGroups, PatchPermissions, PermissionGroupMetadata, Role } from "common/models";
import { OrganizationDoc } from "../models/organization";
import { UserDoc } from "../models/user";

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

export async function userHasPermissions(user: UserDoc, org: OrganizationDoc, requiredPermissions: PatchPermissions[]): Promise<boolean> {
    const orgConfig = user.organizations && user.organizations[org.id];
    if (!orgConfig) {
        throw new Forbidden(`You do not have access to the requested org.`);
    }

    // Get all the roles that belong to a user.
    const userRoles = [];
    orgConfig.roleIds.forEach(id => {
        const assignedRole = org.roleDefinitions.find(
            roleDef => roleDef.id == id
        );    
        if (assignedRole) {
            userRoles.push(assignedRole);
        }
    });

    // Resolve all the permissions granted to a user based on their role(s).
    const userPermissions = resolvePermissionsFromRoles(userRoles);
    for (const permission of requiredPermissions) {
        // If any required permission is missing, return false.
        if (!userPermissions.has(permission as PatchPermissions)) {
            return false;
        }
    }

    // If we make it here then all required permissions were found.
    return true;
}