import { makeAutoObservable } from 'mobx';
import { getStore, Store } from './meta';
import { IDispatchStore, IUserStore } from './interfaces';
import { OrgContext } from '../../../common/api';
import { getService } from '../services/meta';
import { IAPIService } from '../services/interfaces';

@Store()
export default class DispatchStore implements IDispatchStore {

    private userStore = getStore<IUserStore>(IUserStore);
    private api = getService<IAPIService>(IAPIService)

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
            await this.api.broadcastRequest(this.orgContext(), requestId, to);
        } catch (e) {
            console.error(e);
        }
    }

    async assignRequest(requestId: string, to: string[]) {
        try {
            console.log(this.userStore)
            await this.api.assignRequest(this.orgContext(), requestId, to)
        } catch (e) {
            console.error(e);
        }
    }

    clear() {

    }
   
}