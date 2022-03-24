import { makeAutoObservable } from 'mobx';
import { Store } from './meta';
import { EditOrganizationData, IOrganizationStore, IEditOrganizationStore, userStore, organizationStore, requestStore } from './interfaces';
import { PatchPermissions, Role, MinRole } from '../../../common/models';
import { OrgContext, RoleContext } from '../../../common/api';
import { api } from '../services/interfaces';

@Store(IEditOrganizationStore)
export default class EditOrganizationStore implements IEditOrganizationStore  {
    roleDefinitions: Role[] = []
    currentRoleName: string = ''
    currentRolePermissions: PatchPermissions[] = []

    constructor() {
        makeAutoObservable(this)
    }

    orgContext(): OrgContext {
        return {
            token: userStore().authToken,
            orgId: userStore().currentOrgId
        }
    }

    roleContext(roleId: string): RoleContext {
        return {
            roleId,
            ...this.orgContext()
        }
    }

    async editOrganization(orgId: string) {
        try {
            const orgMetadata = {
                id: orgId,
                roleDefinitions: this.roleDefinitions
            }

            const updatedOrg = await api().editOrgMetadata(this.orgContext(), orgMetadata);
            organizationStore().updateOrgData(updatedOrg);
        } catch (e) {
            console.error(e);
        }
    }

    async createNewRole() {
        const role: MinRole = {
            name: this.currentRoleName,
            permissions: this.currentRolePermissions
        }

        const createdRole = await api().createNewRole(this.orgContext(), role);

        try {
            await organizationStore().updateOrAddRole(createdRole);
        } catch (e) {
            console.error(e);
        }

        return createdRole;
    }

    // TODO: delete role
    async editRole(roleId: string) {
        try {
            const role = {
                id: roleId,
                name: this.currentRoleName,
                permissions: this.currentRolePermissions
            }

            const updatedRole = await api().editRole(this.roleContext(roleId), role);
            organizationStore().updateOrAddRole(updatedRole);
        } catch (e) {
            console.error(e);
        }
    }

    loadOrg(org: EditOrganizationData) {
        this.roleDefinitions = org.roleDefinitions
    }

    clear() {
        this.roleDefinitions = []
        this.currentRoleName = ''
        this.currentRolePermissions = []
     }
   
}