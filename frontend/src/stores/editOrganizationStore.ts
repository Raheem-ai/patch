import { makeAutoObservable } from 'mobx';
import { Store } from './meta';
import { EditOrganizationData, IOrganizationStore, IEditOrganizationStore, userStore, organizationStore, requestStore } from './interfaces';
import { Role } from '../../../common/models';
import { OrgContext } from '../../../common/api';
import { api } from '../services/interfaces';

@Store(IEditOrganizationStore)
export default class EditOrganizationStore implements IEditOrganizationStore  {
    roleDefinitions: Role[]
    currentRole: Role

    constructor() {
        makeAutoObservable(this)
    }

    // needed?
    orgContext(): OrgContext {
        return {
            token: userStore().authToken,
            orgId: userStore().currentOrgId
        }
    }

    // separate editRole, editTag, editAttribute functions OR
    // just one editOrganization function?
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

    // create role
    // edit role
    // delete role

    loadOrg(org: EditOrganizationData) {
        this.roleDefinitions = org.roleDefinitions
    }

    clear() {
        this.roleDefinitions = []
     }
   
}