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

    get requestPrefix() {
        return this.metadata.name.slice(0, 3).toUpperCase()
    }

    constructor() {
        makeAutoObservable(this)
    }

    async init() {
        await userStore().init();

        if (userStore().signedIn) {
            await this.getOrgDataAfterSignin();
        } else {
            when(() => userStore().signedIn, this.getOrgDataAfterSignin)
        }
    }

    orgContext = (): OrgContext => {
        return {
            token: userStore().authToken,
            orgId: userStore().currentOrgId
        }
    }

    getOrgDataAfterSignin = async () => {
        await this.getOrgData()

        when(() => !userStore().signedIn, () => {
            when(() => userStore().signedIn, this.getOrgDataAfterSignin)
        })
    }

    getOrgData = async () => {
        try {
            const data = await api().getOrgMetadata(this.orgContext());
            runInAction(() => {
                this.metadata = data;
            })
        } catch (e) {
            console.error(e);
        }
    }

    updateOrgData = (updatedOrg: OrganizationMetadata): void => {
        runInAction(() => {
            this.metadata = {
                id: updatedOrg.id,
                name: updatedOrg.name,
                roleDefinitions: updatedOrg.roleDefinitions
            }
        });
    }

    updateOrAddRole(updatedRole: Role) {
        let index = this.metadata.roleDefinitions.findIndex(
            roleDef => roleDef.id == updatedRole.id
        );

        runInAction(() => {
            if (index >= 0) {
                this.metadata.roleDefinitions[index] = updatedRole;
            } else {
                this.metadata.roleDefinitions.push(updatedRole);
            }

            // TODO: prolly should remove metadata object and put props on store for consistency
            this.metadata = Object.assign({}, this.metadata)
        });
    }

    clear() {
        this.metadata = null;
    }
}