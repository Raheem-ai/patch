import { makeAutoObservable, runInAction, when } from 'mobx';
import { Store } from './meta';
import { IOrganizationStore, userStore } from './interfaces';
import { api } from '../services/interfaces';
import { OrganizationMetadata, Role } from '../../../common/models';

@Store(IOrganizationStore)
export default class OrganizationStore implements IOrganizationStore {
    metadata: OrganizationMetadata;

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

    async getOrgData(): Promise<void> {
        try {
            const data = await api().getOrgMetadata({
                token: userStore().authToken,
                orgId: userStore().currentOrgId
            })

            runInAction(() => {
                this.metadata = data;
            })
        } catch (e) {
            console.error(e);
        }
    }

    updateOrgData(updatedOrg: OrganizationMetadata) {
        this.metadata = {
            id: updatedOrg.id,
            name: updatedOrg.name,
            roleDefinitions: updatedOrg.roleDefinitions
        }
    }

    updateOrAddRole(updatedRole: Role) {
        // Is there are reason OrganizationMetadata.roleDefinitions shouldn't be a Map<string, Role>?
        if (updatedRole.id) {
            let index = this.metadata.roleDefinitions.findIndex(
                roleDef => roleDef.id == updatedRole.id
            );
            // TODO: Any chance index not found?
            this.metadata.roleDefinitions[index] = updatedRole;
        } else {
            this.metadata.roleDefinitions.push(updatedRole);
        }
    }

    clear() {
        this.metadata = null;
    }
}