import { makeAutoObservable, when } from 'mobx';
import { Store } from './meta';
import { IOrganizationStore, userStore } from './interfaces';

@Store(IOrganizationStore)
export default class OrganizationStore implements IOrganizationStore {
    orgId = null;
    name = null;

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


    getOrgDataAfterSignin = async () => {
        this.orgId = userStore().currentOrgId;
    }

    clear() {

    }
}