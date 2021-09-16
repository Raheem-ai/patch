import { makeAutoObservable, runInAction } from 'mobx';
import API from '../api';
import { getStore, Store } from './meta';
import { IDispatchStore, IUserStore } from './interfaces';
import { OrgContext } from '../../../common/api';

@Store()
export default class DispatchStore implements IDispatchStore {

    private userStore = getStore<IUserStore>(IUserStore);

    constructor() {
        makeAutoObservable(this)
    }

    orgContext(): OrgContext {
        return {
            token: this.userStore.authToken,
            orgId: this.userStore.currentOrgId
        }
    }
    
    async broadcastRequest(requestId: string, to: string[]) {
        try {
            await API.broadcastRequest(this.orgContext(), requestId, to);
        } catch (e) {
            console.error(e);
        }
    }

    async assignRequest(requestId: string, to: string[]) {
        try {
            console.log(this.userStore)
            await API.assignRequest(this.orgContext(), requestId, to)
        } catch (e) {
            console.error(e);
        }
    }
   
}