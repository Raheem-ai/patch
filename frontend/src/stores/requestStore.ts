import { autorun, makeAutoObservable, ObservableMap, reaction, runInAction, set, when } from 'mobx';
import { Store } from './meta';
import { IRequestStore, IUserStore, organizationStore, PositionMetadata, userStore } from './interfaces';
import { OrgContext, RequestContext } from '../../../common/api';
import { DefaultRoleIds, HelpRequest, HelpRequestFilter, HelpRequestSortBy, PatchPermissions, Position, RequestStatus, RequestTeamEvent, RequestTeamEventTypes, ResponderRequestStatuses } from '../../../common/models';
import { api, IAPIService } from '../services/interfaces';
import { persistent, securelyPersistent } from '../meta';
import { iHaveAllPermissions } from '../utils';

@Store(IRequestStore)
export default class RequestStore implements IRequestStore {

    loading = false;

    @securelyPersistent({
        // TODO: create standard decorators to handle this de/serialization
        // Could also allow for serialization into classes from raw json 
        resolvers: {
            toJSON: (val: ObservableMap) => {
                return val.entries ? val.entries() : {}
            },
            fromJSON: (entries) => new ObservableMap(entries)
        }
    }) requests: Map<string, HelpRequest> = new ObservableMap();
    
    // make this a stack of req ids
    @persistent() currentRequestIdStack: string[] = [];
    @persistent() filter = HelpRequestFilter.Active;
    @persistent() sortBy = HelpRequestSortBy.ByTime;

    constructor() {
        makeAutoObservable(this)
    }

    async init() {
        await userStore().init();

        if (userStore().signedIn) {
            await this.getRequestsAfterSignin()
        } else {
            when(() => userStore().signedIn, this.getRequestsAfterSignin)
        }
    }

    get requestsArray() {
        return Array.from(this.requests.values());
    }
    
    get currentRequestId() {
        const idx = this.currentRequestIdStack.length - 1;
        
        return idx >= 0 
            ? this.currentRequestIdStack[idx]
            : null;
    }

    set currentRequestId(id) {
        const idx = this.currentRequestIdStack.length - 1;

        if (idx >= 0) {
            this.currentRequestIdStack[this.currentRequestIdStack.length - 1] = id;
        } else {
            this.currentRequestIdStack.push(id)
        }
    }

    get currentRequest() {
        return this.requests.get(this.currentRequestId) || null
    }

    get activeRequest() {
        return this.activeRequests.length 
            ? this.activeRequests[this.activeRequests.length - 1]
            : null;
    }

    get activeRequests() {
        return this.requestsArray.filter((r) => r.status != RequestStatus.Done && r.assignedResponderIds.includes(userStore().user.id));
    }

    get currentUserActiveRequests() {
        return this.requestsArray.filter((r) => r.status != RequestStatus.Done && r.assignedResponderIds.includes(userStore().currentUser?.id));
    }

    get requestPositionMetadata() {
        const map: Map<string, Map<string, PositionMetadata>> = new Map();

        this.requestsArray.forEach(req => {
            const posMap = new Map<string, PositionMetadata>();

            req.positions.forEach(pos => {
                posMap.set(pos.id, this.computePositionMetadata(req.teamEvents, pos))
            })

            map.set(req.id, posMap)
        })

        return map;
    }

    getPositionMetadata(requestId: string, positionId: string): PositionMetadata {
        return this.requestPositionMetadata.get(requestId).get(positionId);
    }

    computePositionMetadata(teamEvents: RequestTeamEvent[], position: Position): PositionMetadata {
        const myId = userStore().user.id;
        const myAttributes = userStore().user.organizations[userStore().currentOrgId].attributes;
        const myRoles = organizationStore().userRoles.get(myId)
        const isRequestAdmin = iHaveAllPermissions([PatchPermissions.RequestAdmin])
        
        const haveAllAttributes = position.attributes.every(attr => !!myAttributes.find(myAttr => myAttr.categoryId == attr.categoryId && myAttr.itemId == attr.itemId));
        
        const haveRole =  (position.role == DefaultRoleIds.Anyone)
            || !!myRoles.find(role => role.id == position.role);

        let haveBeenKicked = false;
        let waitingOnRequestResults = false; 
        let requestDenied = false;
        let unseenJoinRequest = false;

        // TODO: this can be optimized by analyzing the teamEvents for all positions in one iteration
        // by keeping track of the state for each position individually
        teamEvents.forEach(event => {
            // TODO: type gaurds to make this more ergo
            if (event.type == RequestTeamEventTypes.PositionRevoked) {
                const e = event as RequestTeamEvent<RequestTeamEventTypes.PositionRevoked>;
                
                if (e.user == myId && e.position == position.id) {
                    haveBeenKicked = true
                }
            } else if (event.type == RequestTeamEventTypes.PositionRequested) {
                const e = event as RequestTeamEvent<RequestTeamEventTypes.PositionRequested>;

                if (e.requester == myId && e.position == position.id) {
                    waitingOnRequestResults = true;
                }

                if (isRequestAdmin && e.position == position.id) {
                    unseenJoinRequest = true;
                }
            } else if (waitingOnRequestResults && event.type == RequestTeamEventTypes.PositionRequestDenied) {
                const e = event as RequestTeamEvent<RequestTeamEventTypes.PositionRequestDenied>;

                if (e.requester == myId && e.position == position.id) {
                    requestDenied = true;
                    waitingOnRequestResults = false;
                }
            } else if (waitingOnRequestResults && event.type == RequestTeamEventTypes.PositionRequestAccepted) {
                const e = event as RequestTeamEvent<RequestTeamEventTypes.PositionRequestAccepted>;

                if (e.requester == myId && e.position == position.id) {
                    requestDenied = false;
                    waitingOnRequestResults = false;

                    // request to join -> approved -> kicked -> request to join -> approved
                    haveBeenKicked = false;
                }
            } else if (event.type == RequestTeamEventTypes.PositionRequestSeen) {
                const e = event as RequestTeamEvent<RequestTeamEventTypes.PositionRequestSeen>;

                if (e.by == myId && e.position == position.id) {
                    unseenJoinRequest = false;
                }
            } 
        })

        const canLeave = position.joinedUsers.includes(myId);
        const canJoin = haveAllAttributes && haveRole && !haveBeenKicked;
        const canRequestToJoin = !waitingOnRequestResults && !requestDenied;

        return {
            canJoin, 
            canLeave,
            canRequestToJoin,
            unseenJoinRequest
        }
    }

    getRequestsAfterSignin = async () => {
        await this.getRequests();

        when(() => !userStore().signedIn, () => {
            when(() => userStore().signedIn, this.getRequestsAfterSignin)
        })
    }

    clear() {
        runInAction(() => {
            this.requests.clear();
            // this.currentRequest = null
            this.currentRequestIdStack = []
            // this.activeRequest = null
            // this.activeRequests = []
        })
    }

    orgContext(orgId?: string): OrgContext {
        return {
            token: userStore().authToken,
            orgId: orgId || userStore().currentOrgId
        }
    }

    requestContext(requestId: string, orgId?: string): RequestContext {
        return {
            requestId,
            ...this.orgContext(orgId)
        } 
    }

    get filteredRequests(): HelpRequest[] {
        return this.requestsArray.filter((r) => {
            switch (this.filter) {
                case HelpRequestFilter.Active:
                    return r.status != RequestStatus.Done
                case HelpRequestFilter.Finished:
                    return r.status == RequestStatus.Done
                case HelpRequestFilter.All:
                    return true;
            }
        })
    }

    get filteredSortedRequests(): HelpRequest[] {
        return this.filteredRequests.sort((a, b) => {
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

    // async confirmRequestAssignment(orgId: string, reqId: string) {
    //     const req = await api().confirmRequestToJoinRequest(this.orgContext(orgId), reqId);

    //     runInAction(() => { 
    //         this.updateOrAddReq(req);
    //     })
    // }


    /**
     * NOTE: should only be called from header config back button for request details
     * page
     */
    async tryPopRequest() {
        // TODO: this being used for the map index and for the current request for other views
        // is making the header flash old reqeuest ids when you go detailsA > ActiveRequesDetails > back > back
        if (this.currentRequestIdStack.length > 1) {
            this.currentRequestIdStack.pop();
        }
    }
    
    /**
     * NOTE: should only be called from request details when routed there by 
     * a notification
     */
    async pushRequest(requestId: string): Promise<void> {
        try {
            this.loading = true;

            const req = await api().getRequest(this.orgContext(), requestId);

            const userIdSet = new Set<string>();

            const allAssignedUserIds = req.assignments.reduce<string[]>((arr, r) => { 
                arr.push(...r.responderIds);
                return arr;
            }, []);

            [ req.dispatcherId, ...req.assignedResponderIds, ...req.declinedResponderIds, ...allAssignedUserIds ].forEach(id => userIdSet.add(id));

            // TODO: might be worth having a common response type that returns 
            // related objects to save us a round trip call for this and other tings
            await userStore().updateOrgUsers(Array.from(userIdSet.values()));

            // let idx = this.requestsArray.findIndex((r => r.id == req.id));

            runInAction(() => {                
                this.updateOrAddReq(req);
                
                this.currentRequestIdStack.push(req.id);

                this.loading = false
            })
        } catch (e) {
            runInAction(() => {
                this.loading = false;
            })

            console.error(e);
        }
    }
    
    async getRequests(requestIds?: string[]): Promise<void> {
        try {
            const oldCurrentReqId = this.currentRequest?.id;
            let possibleUpdatedCurrentReq:  HelpRequest;

            const requests = await api().getRequests(this.orgContext(), requestIds);

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
            await userStore().updateOrgUsers(Array.from(userIdSet.values()));

            runInAction(() => {
                requests.forEach(r => this.updateOrAddReq(r))
                this.setCurrentRequest(possibleUpdatedCurrentReq)
            })
        } catch (e) {
            console.error(e);
        }
    }

    async getRequest(requestId: string) {
        const req = await api().getRequest(this.orgContext(), requestId);

        const userIdSet = new Set<string>();

        const allAssignedUserIds = req.assignments.reduce<string[]>((arr, r) => { 
            arr.push(...r.responderIds);
            return arr;
        }, []);

        [ req.dispatcherId, ...req.assignedResponderIds, ...req.declinedResponderIds, ...allAssignedUserIds].forEach(id => userIdSet.add(id));

        // TODO: might be worth having a common response type that returns 
        // related objects to save us a round trip call for this and other tings
        await userStore().updateOrgUsers(Array.from(userIdSet.values()));

        runInAction(() => {
            this.updateOrAddReq(req)
        })
    }

    setCurrentRequest(request?: HelpRequest) {
        if (!request) {
            return
        }

        runInAction(() => {
            this.currentRequestId = request.id;
        })
    }

    async setRequestStatus(requestId: string, status: ResponderRequestStatuses): Promise<void> {
        const req = await api().setRequestStatus(this.requestContext(requestId), status);
        this.updateOrAddReq(req);
    }

    async resetRequestStatus(requestId: string): Promise<void> {
        const req = await api().resetRequestStatus(this.requestContext(requestId));
        this.updateOrAddReq(req);
    }

    async updateChatReceipt(request: HelpRequest): Promise<void> {
        const chat = request.chat;

        if (!!chat && chat.lastMessageId > chat.userReceipts[userStore().user.id]) {
            const updatedReq = await api().updateRequestChatReceipt({
                requestId: request.id,
                orgId: request.orgId,
                token: userStore().authToken
            }, chat.lastMessageId)

            this.updateOrAddReq(updatedReq)
        }
    }

    async sendMessage(request: HelpRequest, message: string) {
        const updatedReq = await api().sendChatMessage(
            this.requestContext(request.id, request.orgId), 
            message
        );

        this.updateOrAddReq(updatedReq);
    }

    async ackRequestNotification(requestId: string) {
        const updatedReq = await api().ackRequestNotification(this.orgContext(), requestId);
        this.updateRequestInternals(updatedReq);
    }

    async joinRequest(requestId: string, positionId: string) {
        const updatedReq = await api().joinRequest(this.orgContext(), requestId, positionId);
        this.updateRequestInternals(updatedReq)
    }

    async leaveRequest(requestId: string, positionId: string) {
        const updatedReq = await api().leaveRequest(this.orgContext(), requestId, positionId);
        this.updateRequestInternals(updatedReq)
    }

    async requestToJoinRequest(requestId: string, positionId: string) {
        const updatedReq = await api().requestToJoinRequest(this.orgContext(), requestId, positionId);
        this.updateRequestInternals(updatedReq);
    }

    async ackRequestToJoinNotification(userId: string, requestId: string, positionId: string) {
        const updatedReq = await api().ackRequestToJoinNotification(this.orgContext(), requestId, userId, positionId);
        this.updateRequestInternals(updatedReq);
    }

    async approveRequestToJoinRequest(userId: string, requestId: string, positionId: string) {
        const updatedReq = await api().confirmRequestToJoinRequest(this.orgContext(), requestId, userId, positionId);
        this.updateRequestInternals(updatedReq);
    }

    async denyRequestToJoinRequest(userId: string, requestId: string, positionId: string) {
        const updatedReq = await api().declineRequestToJoinRequest(this.orgContext(), requestId, userId, positionId);
        this.updateRequestInternals(updatedReq);
    }

    async removeUserFromRequest(userId: string, requestId: string, positionId: string) {
        const updatedReq = await api().removeUserFromRequest(this.orgContext(), userId, requestId, positionId);
        this.updateRequestInternals(updatedReq);
    }

    updateOrAddReq(updatedReq: HelpRequest) {
        this.requests.set(updatedReq.id, updatedReq);
    }

    updateRequestInternals(updatedReq: HelpRequest) {
        const req = this.requests.get(updatedReq.id);

        for (const prop in updatedReq) {
            req[prop] = updatedReq[prop]
        }
    }

    // updateReq(updatedReq: HelpRequest, givenIndex?: number) {
    //     const index = typeof givenIndex == 'number' 
    //         ? givenIndex
    //         : this.requestsArray.findIndex(r => r.id == updatedReq.id);

    //     if (index != -1) {
    //         runInAction(() => {
    //             for (const prop in updatedReq) {
    //                 this.requestsArray[index][prop] = updatedReq[prop]
    //             }
    //         })

    //         return true;
    //     } else {
    //         return false;
    //     }
    // }
}