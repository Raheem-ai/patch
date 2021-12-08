import { isComputed, isObservable, makeAutoObservable, ObservableSet, runInAction } from 'mobx';
import { getStore, Store } from './meta';
import { IDispatchStore, IRequestStore, IUserStore } from './interfaces';
import { OrgContext } from '../../../common/api';
import { getService } from '../services/meta';
import { IAPIService } from '../services/interfaces';
import { persistent } from '../meta';

@Store(IDispatchStore)
export default class DispatchStore implements IDispatchStore {

    private userStore = getStore<IUserStore>(IUserStore);
    private api = getService<IAPIService>(IAPIService)
    private requestStore = getService<IRequestStore>(IRequestStore)

    @persistent() includeOffDuty = false;
    @persistent() selectAll = false;

    selectedResponderIds = new ObservableSet<string>()

    constructor() {
        makeAutoObservable(this)
    }

    orgContext(): OrgContext {
        return {
            token: this.userStore.authToken,
            orgId: this.userStore.currentOrgId
        }
    }

    get assignableResponders() {
        return this.includeOffDuty 
            ? this.userStore.usersInOrg
            : this.userStore.usersInOrg.filter((user) => {
                return user.organizations[this.userStore.currentOrgId]?.onDuty
            });
    }

    get selectedResponders() {
        return Array.from(this.selectedResponderIds.values()).map(id => this.userStore.users.get(id));
    }

    async toggleSelectAll() {
        this.selectAll = !this.selectAll;

        if (this.selectAll) {
            this.assignableResponders.forEach(r => this.selectedResponderIds.add(r.id))
        } else {
            this.selectedResponderIds.clear()
        }
    }
    
    async toggleIncludeOffDuty() {
        this.includeOffDuty = !this.includeOffDuty
    }

    async toggleResponder(userId: string) {
        if (!this.selectAll) {
            if (this.selectedResponderIds.has(userId)) {
                this.selectedResponderIds.delete(userId)
            } else {
                this.selectedResponderIds.add(userId)
            }
        } else {
            this.selectAll = !this.selectAll;

            this.selectedResponderIds.delete(userId);
        }
    }
    
    async broadcastRequest(requestId: string, to: string[]) {
        try {
            await this.api.broadcastRequest(this.orgContext(), requestId, to);
        } catch (e) {
            console.error(e);
        }
    }

    async assignRequest(requestId: string, responderIds: string[]) {
        try {
            const updatedReq = await this.api.assignRequest(this.orgContext(), requestId, responderIds)

            runInAction(() => {
                this.requestStore.updateReq(updatedReq)
                this.clear()
            })
        } catch (e) {
            console.error(e);
        }
    }

    clear() {
        this.selectedResponderIds.clear()
    }
}