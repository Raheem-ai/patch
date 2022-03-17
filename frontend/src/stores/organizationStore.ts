import { makeAutoObservable, runInAction, when } from 'mobx';
import { Store } from './meta';
import { IOrganizationStore, userStore } from './interfaces';
import { api } from '../services/interfaces';
import { OrganizationMetadata } from '../../../common/models';

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

    clear() {
        this.metadata = null;
    }
}