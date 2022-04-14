import { makeAutoObservable } from 'mobx';
import { Store } from './meta';
import { EditOrganizationData, IEditOrganizationStore, userStore, organizationStore } from './interfaces';
import { PatchPermissions, Role, MinRole } from '../../../common/models';
import { OrgContext, RoleContext } from '../../../common/api';
import { api } from '../services/interfaces';

@Store(IEditOrganizationStore)
export default class EditOrganizationStore implements IEditOrganizationStore  {
    name: string = '';
    roleDefinitions: Role[] = []

    constructor() {
        makeAutoObservable(this)
    }

    orgContext = (): OrgContext => {
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
        const orgMetadata = {
            id: orgId,
            roleDefinitions: this.roleDefinitions
        }

        try {
            const updatedOrg = await api().editOrgMetadata(this.orgContext(), orgMetadata);
            organizationStore().updateOrgData(updatedOrg);
            return updatedOrg;
        } catch (e) {
            console.error(e);
        }
    }

    async deleteRoles(roleIds: string[]) {
        return await api().deleteRoles(this.orgContext(), roleIds);
    }

    loadOrg(org: EditOrganizationData) {
        this.name = org.name;
        this.roleDefinitions = org.roleDefinitions;
    }

    clear() {
        this.name = '';
        this.roleDefinitions = [];
     }
   
}