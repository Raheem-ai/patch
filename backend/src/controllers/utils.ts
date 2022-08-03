import { Forbidden } from "@tsed/exceptions";
import { PatchPermissionGroups, PatchPermissions, PermissionGroupMetadata, Role } from "common/models";
import { OrganizationDoc } from "../models/organization";
import { UserDoc } from "../models/user";
import { resolvePermissionsFromRoles } from 'common/utils/permissionUtils'
import STRINGS from "../../../common/strings"

export async function userHasPermissions(user: UserDoc, org: OrganizationDoc, requiredPermissions: PatchPermissions[]): Promise<boolean> {
    const orgConfig = user.organizations && user.organizations[org.id];
    if (!orgConfig) {
        throw new Forbidden(STRINGS.ACCOUNT.noOrgAccess);
    }

    // Get all the roles that belong to a user.
    const userRoles: Role[] = [];
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