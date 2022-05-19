import { makeAutoObservable, ObservableSet, runInAction } from 'mobx';
import { Store } from './meta';
import { IDispatchStore, requestStore, userStore } from './interfaces';
import { OrgContext } from '../../../common/api';
import { persistent } from '../meta';
import { api } from '../services/interfaces';

@Store(IDispatchStore)
export default class DispatchStore implements IDispatchStore {

    @persistent() includeOffDuty = false;
    @persistent() selectAll = false;

    selectedResponderIds = new ObservableSet<string>()

    constructor() {
        makeAutoObservable(this)
    }

    orgContext(): OrgContext {
        return {
            token: userStore().authToken,
            orgId: userStore().currentOrgId
        }
    }

    get assignableResponders() {
        return this.includeOffDuty 
            ? userStore().usersInOrg
            : userStore().usersInOrg.filter((user) => {
                return user.organizations[userStore().currentOrgId]?.onDuty
            });
    }

    get selectedResponders() {
        return Array.from(this.selectedResponderIds.values()).map(id => userStore().users.get(id));
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
        if (this.includeOffDuty) {
            this.selectedResponders.filter((user) => {
                let userCurrentOrgConfig = user.organizations[userStore().currentOrgId];
                return userCurrentOrgConfig && !userCurrentOrgConfig.onDuty;
            }).map((user) => {
                this.toggleResponder(user.id);
            });
        }

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
            await api().broadcastRequest(this.orgContext(), requestId, to);
        } catch (e) {
            console.error(e);
        }
    }

    async assignRequest(requestId: string, responderIds: string[]) {
        try {
            const updatedReq = await api().notifyRespondersAboutRequest(this.orgContext(), requestId, responderIds)

            runInAction(() => {
                requestStore().updateOrAddReq(updatedReq)
            })
        } catch (e) {
            console.error(e);
        }
    }

    clear() {
        this.selectedResponderIds.clear()
    }
}