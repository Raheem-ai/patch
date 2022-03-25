import { makeAutoObservable, runInAction, when } from 'mobx';
import { Store } from './meta';
import { IOrganizationStore, userStore } from './interfaces';
import { api } from '../services/interfaces';
import { MinRole, OrganizationMetadata, Role } from '../../../common/models';
import { OrgContext } from '../../../common/api';

@Store(IOrganizationStore)
export default class OrganizationStore implements IOrganizationStore {
    metadata: OrganizationMetadata = {
        id: '',
        name: '',
        roleDefinitions: []
    };

    constructor() {
        makeAutoObservable(this)
    }

    async init() {
        await userStore().init();
        if (userStore().signedIn) {
            await this.getOrgData();
        } else {
            when(() => userStore().signedIn, this.getOrgData)
        }
    }

    orgContext(): OrgContext {
        return {
            token: userStore().authToken,
            orgId: userStore().currentOrgId
        }
    }

    async getOrgData(): Promise<void> {
        try {
            const data = await api().getOrgMetadata(this.orgContext());
            runInAction(() => {
                this.metadata = data;
            })
        } catch (e) {
            console.error(e);
        }
    }

    async updateOrgData(updatedOrg: OrganizationMetadata) {
        updatedOrg = await api().editOrgMetadata(this.orgContext(), updatedOrg);
        this.metadata = {
            id: updatedOrg.id,
            name: updatedOrg.name,
            roleDefinitions: updatedOrg.roleDefinitions
        }
    }

    async updateOrAddRole(updatedRole: MinRole | Role) {
        const role = updatedRole.id ?
            await api().editRole(this.orgContext(), updatedRole as Role) :
            await api().createNewRole(this.orgContext(), updatedRole);

        let index = this.metadata.roleDefinitions.findIndex(
            roleDef => roleDef.id == role.id
        );

        if (index >= 0) {
            this.metadata.roleDefinitions[index] = role;
        } else {
            this.metadata.roleDefinitions.push(role);
        }
    }

    clear() {
        this.metadata = null;
    }
}