import { autorun, makeAutoObservable, reaction, runInAction, set, when } from 'mobx';
import { getStore, Store } from './meta';
import { IRequestStore, IUserStore } from './interfaces';
import { OrgContext, RequestContext } from '../../../common/api';
import { HelpRequest, HelpRequestFilter, HelpRequestSortBy, RequestStatus, ResponderRequestStatuses } from '../../../common/models';
import { getService } from '../services/meta';
import { IAPIService } from '../services/interfaces';
import { persistent, securelyPersistent } from '../meta';

@Store(IRequestStore)
export default class RequestStore implements IRequestStore {

    private userStore = getStore<IUserStore>(IUserStore);
    private api = getService<IAPIService>(IAPIService)

    loading = false;

    @securelyPersistent() requests: HelpRequest[] = [];
    @persistent() currentRequestIdxStack: number[] = [-1];
    @persistent() filter = HelpRequestFilter.Active;
    @persistent() sortBy = HelpRequestSortBy.ByTime;

    constructor() {
        makeAutoObservable(this)
    }

    async init() {
        await this.userStore.init();

        if (this.userStore.signedIn) {
            await this.getRequestsAfterSignin()
        } else {
            when(() => this.userStore.signedIn, this.getRequestsAfterSignin)
        }
    }
    
    get currentRequestIdx() {
        return this.currentRequestIdxStack[this.currentRequestIdxStack.length - 1];
    }

    set currentRequestIdx(idx) {
        this.currentRequestIdxStack[this.currentRequestIdxStack.length - 1] = idx;
    }

    get currentRequest() {
        const idx = this.currentRequestIdx + 1;
        return this.requests.length && (idx <= this.requests.length - 1) ? this.requests[idx] : null;
    }

    get activeRequest() {
        return this.activeRequests.length 
            ? this.activeRequests[this.activeRequests.length - 1]
            : null;
    }

    get activeRequests() {
        return this.requests.filter((r) => r.status != RequestStatus.Done && r.assignedResponderIds.includes(this.userStore.user.id));
    }

    get currentUserActiveRequests() {
        return this.requests.filter((r) => r.status != RequestStatus.Done && r.assignedResponderIds.includes(this.userStore.currentUser?.id));
    }

    getRequestsAfterSignin = async () => {
        await this.getRequests();

        when(() => !this.userStore.signedIn, () => {
            when(() => this.userStore.signedIn, this.getRequestsAfterSignin)
        })
    }

    clear() {
        runInAction(() => {
            this.requests = []
            // this.currentRequest = null
            this.currentRequestIdxStack = [-1]
            // this.activeRequest = null
            // this.activeRequests = []
        })
    }

    orgContext(orgId?: string): OrgContext {
        return {
            token: this.userStore.authToken,
            orgId: orgId || this.userStore.currentOrgId
        }
    }

    requestContext(requestId: string, orgId?: string): RequestContext {
        return {
            requestId,
            ...this.orgContext(orgId)
        } 
    }

    get sortedRequests(): HelpRequest[] {
        return this.requests.slice().sort((a, b) => {
            switch (this.sortBy) {
                case HelpRequestSortBy.ByTime:
                    return this.sortByTime(a, b)
                case HelpRequestSortBy.ByStatus:
                    return this.sortByStatus(a, b)
            }
        })
    }

    sortByTime = (a: HelpRequest, b: HelpRequest): number => {
        return a.createdAt == b.createdAt
            ? 0
            : a.createdAt < b.createdAt
                ? -1
                : 1
    }

    sortByStatus = (a: HelpRequest, b: HelpRequest): number => {
        return a.status == b.status
            ? 0
            : a.status < b.status
                ? -1
                : 1
    }

    setSortBy = (sortBy: HelpRequestSortBy) => {
        this.sortBy = sortBy
    }
    
    setFilter = async (filter: HelpRequestFilter) => {
        this.filter = filter;
        await this.getRequests()
        // stop loading
    }

    async confirmRequestAssignment(orgId: string, reqId: string) {
        const req = await this.api.confirmRequestAssignment(this.orgContext(orgId), reqId);

        runInAction(() => { 
            this.updateOrAddReq(req);
        })
    }


    /**
     * NOTE: should only be called from header config back button for request details
     * page
     */
    async tryPopRequest() {
        // TODO: this being used for the map index and for the current request for other views
        // is making the header flash old reqeuest ids when you go detailsA > ActiveRequesDetails > back > back
        if (this.currentRequestIdxStack.length > 1) {
            this.currentRequestIdxStack.pop();
        }
    }
    
    /**
     * NOTE: should only be called from request details when routed there by 
     * a notification
     */
    async pushRequest(requestId: string): Promise<void> {
        try {
            this.loading = true;

            const req = await this.api.getRequest(this.orgContext(), requestId);

            const userIdSet = new Set<string>();

            const allAssignedUserIds = req.assignments.reduce<string[]>((arr, r) => { 
                arr.push(...r.responderIds);
                return arr;
            }, []);

            [ req.dispatcherId, ...req.assignedResponderIds, ...req.declinedResponderIds, ...allAssignedUserIds ].forEach(id => userIdSet.add(id));

            // TODO: might be worth having a common response type that returns 
            // related objects to save us a round trip call for this and other tings
            await this.userStore.updateOrgUsers(Array.from(userIdSet.values()));

            let idx = this.requests.findIndex((r => r.id == req.id));

            runInAction(() => {
                if (idx < 0) {
                    // add request if we don't have it already
                    this.requests.push(req);
                    idx = this.requests.length - 1;
                } else {
                    // update req if we have it already
                    this.updateReq(req, idx);
                }
                
                this.currentRequestIdxStack.push(idx - 1);

                this.loading = false
            })
        } catch (e) {
            runInAction(() => {
                this.loading = false;
            })

            console.error(e);
        }
    }
    
    async getRequests(): Promise<void> {
        try {
            const oldCurrentReqId = this.currentRequest?.id;
            let possibleUpdatedCurrentReq:  HelpRequest;

            const requests = await this.api.getRequests(this.orgContext(), this.filter);

            const userIdSet = new Set<string>();

            for (const req of requests) {
                const allAssignedUserIds = req.assignments.reduce<string[]>((arr, r) => { 
                    arr.push(...r.responderIds);
                    return arr;
                }, []);

                [ req.dispatcherId, ...req.assignedResponderIds, ...req.declinedResponderIds, ...allAssignedUserIds].forEach(id => userIdSet.add(id));
                
                if (req.id == oldCurrentReqId) {
                    possibleUpdatedCurrentReq = req;
                }
            }

            // TODO: might be worth having a common response type that returns 
            // related objects to save us a round trip call for this and other tings
            await this.userStore.updateOrgUsers(Array.from(userIdSet.values()));

            runInAction(() => {
                this.requests = requests;
                this.setCurrentRequest(possibleUpdatedCurrentReq)
            })
        } catch (e) {
            console.error(e);
        }
    }

    setCurrentRequest(request?: HelpRequest) {
        if (!request) {
            return runInAction(() => {
                this.currentRequestIdx = -1;
            })
        }

        const idx = this.requests.findIndex(r => r.id == request.id);

        if (idx < 0) {
            console.error('THIS SHOULD NEVER HAPPEN')
            
            return runInAction(() => {
                this.currentRequestIdx = -1;
            })
        }

        runInAction(() => {
            this.currentRequestIdx = idx - 1;
        })
    }

    async setRequestStatus(requestId: string, status: ResponderRequestStatuses): Promise<void> {
        const req = await this.api.setRequestStatus(this.requestContext(requestId), status);
        this.updateReq(req);
    }

    async resetRequestStatus(requestId: string): Promise<void> {
        const req = await this.api.resetRequestStatus(this.requestContext(requestId));
        this.updateReq(req);
    }

    async updateChatReceipt(request: HelpRequest): Promise<void> {
        const chat = request.chat;

        if (!!chat && chat.lastMessageId > chat.userReceipts[this.userStore.user.id]) {
            const updatedReq = await this.api.updateRequestChatReceipt({
                requestId: request.id,
                orgId: request.orgId,
                token: this.userStore.authToken
            }, chat.lastMessageId)

            this.updateReq(updatedReq)
        }
    }

    async sendMessage(request: HelpRequest, message: string) {
        const updatedReq = await this.api.sendChatMessage(
            this.requestContext(request.id, request.orgId), 
            message
        );

        this.updateReq(updatedReq);
    }

    async joinRequest(requestId: string) {
        const updatedReq = await this.api.joinRequest(this.orgContext(), requestId);
        this.updateReq(updatedReq);
    }

    async leaveRequest(requestId: string) {
        const updatedReq = await this.api.leaveRequest(this.orgContext(), requestId);
        this.updateReq(updatedReq);
    }

    async removeUserFromRequest(userId: string, requestId: string) {
        const updatedReq = await this.api.removeUserFromRequest(this.orgContext(), userId, requestId);
        this.updateReq(updatedReq);
    }

    updateOrAddReq(updatedReq: HelpRequest, givenIndex?: number) {
        this.updateReq(updatedReq, givenIndex) || this.requests.push(updatedReq);
    }

    updateReq(updatedReq: HelpRequest, givenIndex?: number) {
        const index = typeof givenIndex == 'number' 
            ? givenIndex
            : this.requests.findIndex(r => r.id == updatedReq.id);

        if (index != -1) {
            runInAction(() => {
                for (const prop in updatedReq) {
                    this.requests[index][prop] = updatedReq[prop]
                }
            })

            return true;
        } else {
            return false;
        }
    }
}