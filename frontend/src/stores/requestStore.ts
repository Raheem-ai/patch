import { autorun, makeAutoObservable, ObservableMap, ObservableSet, reaction, runInAction, set, when } from 'mobx';
import { Store } from './meta';
import { IRequestStore, IUserStore, organizationStore, PositionScopedMetadata, RequestMetadata, RequestScopedMetadata, userStore } from './interfaces';
import { OrgContext, RequestContext } from '../../../common/api';
import { CategorizedItem, DefaultRoleIds, HelpRequest, HelpRequestFilter, HelpRequestSortBy, PatchPermissions, Position, RequestStatus, RequestTeamEvent, RequestTeamEventTypes, ResponderRequestStatuses, Role } from '../../../common/models';
import { api, IAPIService } from '../services/interfaces';
import { persistent, securelyPersistent } from '../meta';
import { iHaveAllPermissions } from '../utils';
import { ContainerModule } from 'inversify';

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
            fromJSON: (entries) => {
                return new ObservableMap(entries)
            }
        }
    }) requests: Map<string, HelpRequest> = new ObservableMap();

    // make sure we don't only rely on a successful api call to turn off the crumbs
    @securelyPersistent({
        resolvers: {
            toJSON: (val: ObservableSet) => {
                return val.values ? Array.from(val.values()) : []
            },
            fromJSON: (values) =>  {
                return new ObservableSet(values.length ? values : [])
            }
        }
    }) seenRequests = new Set<string>();

    @securelyPersistent({
        resolvers: {
            toJSON: (val: ObservableSet) => {
                return val.values ? Array.from(val.values()) : []
            },
            fromJSON: (values) =>  {
                return new ObservableSet(values.length ? values : [])
            }
        }
    }) seenRequestsToJoinRequest = new Set<string>();
    
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
        return this.myActiveRequests.length 
            ? this.myActiveRequests[this.myActiveRequests.length - 1]
            : null;
    }

    get activeRequests() {
        return this.requestsArray.filter((r) => this.requestIsActive(r));
    }

    get myActiveRequests() {
        return this.requestsArray.filter((r) => {
            const imOnRequest = r.positions.some(pos => pos.joinedUsers.includes(userStore().user.id))
            return this.requestIsActive(r) && imOnRequest
        });
    }

    get currentUserActiveRequests() {
        return this.requestsArray.filter((r) => {
            const isOnRequest = r.positions.some(pos => pos.joinedUsers.includes(userStore().currentUser?.id))
            return this.requestIsActive(r) && isOnRequest
        });
    }

    get requestMetadata() {
        const metadataMap = new Map<string, RequestMetadata>()

        const myId = userStore().user.id;
        const myAttributes = userStore().user.organizations[userStore().currentOrgId].attributes;
        const myRoles = organizationStore().userRoles.get(myId)
        const isRequestAdmin = iHaveAllPermissions([PatchPermissions.RequestAdmin])

        this.requestsArray.forEach(req => {
            const posMap = new Map<string, PositionScopedMetadata>();

            req.positions.forEach(pos => {
                posMap.set(pos.id, this.computePositionScopedMetadata(req.teamEvents, pos, myId, myAttributes, myRoles, isRequestAdmin))
            })
            
            const reqMeta = this.computeRequestScopedMetadata(req.teamEvents, myId, isRequestAdmin);

            metadataMap.set(req.id, {
                positions: posMap,
                ...reqMeta
            })
        })

        return metadataMap
    }

    requestIsActive(request: HelpRequest) {
        return request.status != RequestStatus.Done && request.status != RequestStatus.Closed;
    }

    getPositionMetadata(requestId: string, positionId: string): PositionScopedMetadata {
        return this.requestMetadata.get(requestId).positions.get(positionId);
    }

    getRequestMetadata(requestId: string): RequestScopedMetadata {
        const { unseenNotification, notificationsSentTo, notificationsViewedBy } = this.requestMetadata.get(requestId);

        return {
            unseenNotification,
            notificationsSentTo, 
            notificationsViewedBy
        }
    }

    // TODO: later...optimize to handle computing request vs position scoped events in one iteration
    // ...note: collapsing the position scoped one is more important cuz that's teamEvents.length X positions.length
    // vs teamEvents.length x 2 diff metadata scopes 
    computeRequestScopedMetadata(
        teamEvents: RequestTeamEvent[],
        targetUserId: string,
        isRequestAdmin: boolean
    ): RequestScopedMetadata {
        if (!isRequestAdmin) {
            return {
                unseenNotification: false,
                notificationsSentTo: new Map(),
                notificationsViewedBy: new Map()
            }
        }

        let unseenNotification = false;
        let notificationsSentTo = new Map();
        let notificationsViewedBy = new Map();

        teamEvents.forEach(event => {
            if (event.type == RequestTeamEventTypes.NotificationSent) {
                const e = event as RequestTeamEvent<RequestTeamEventTypes.NotificationSent>;
                
                if (e.to.includes(targetUserId)) {
                    unseenNotification = true
                }

                const timestamp = new Date(e.sentAt);

                e.to.forEach(notifiedUser => {
                    notificationsSentTo.set(notifiedUser, timestamp)
                })

            } else if (event.type == RequestTeamEventTypes.NotificationSeen) {
                const e = event as RequestTeamEvent<RequestTeamEventTypes.NotificationSeen>;
                
                if (unseenNotification && e.by == targetUserId) {
                    unseenNotification = false
                }

                notificationsViewedBy.set(e.by, new Date(e.seenAt))
            }
        })

        return {
            unseenNotification,
            notificationsSentTo, 
            notificationsViewedBy
        }
    }

    // TODO: move to common
    // Can be optimized in the future by putting this on the req object 
    // and just updating it whenever we update the team events on the backend
    // so the ui can just use the latest set associated to this version of the
    // req
    usersAssociatedWithRequest(req: HelpRequest) {
        const users = new Set<string>();

        // add dispatcher id
        users.add(req.dispatcherId);

        // add ids of users who
        // 1) were sent a notification 
        // 2) joined a position
        // 3) requested to join a position
        // 4) saw/approved/denied a request to join a position
        // 5) removed a user from a position
        req.teamEvents.forEach(event => {
            const e = event as RequestTeamEvent<RequestTeamEventTypes.NotificationSent>;

            if (event.type == RequestTeamEventTypes.NotificationSent) {
                const e = event as RequestTeamEvent<RequestTeamEventTypes.NotificationSent>;

                users.add(e.by);
                e.to.forEach(userId =>  users.add(userId))
            } else if (event.type == RequestTeamEventTypes.PositionJoined) {
                const e = event as RequestTeamEvent<RequestTeamEventTypes.PositionJoined>;

                users.add(e.user)
            } else if (event.type == RequestTeamEventTypes.PositionRequested) {
                const e = event as RequestTeamEvent<RequestTeamEventTypes.PositionRequested>;

                users.add(e.requester)
            } else if (event.type == RequestTeamEventTypes.PositionRequestSeen) {
                const e = event as RequestTeamEvent<RequestTeamEventTypes.PositionRequestSeen>;

                users.add(e.by)
            } else if (event.type == RequestTeamEventTypes.PositionRequestAccepted) {
                const e = event as RequestTeamEvent<RequestTeamEventTypes.PositionRequestAccepted>;

                users.add(e.by)
            } else if (event.type == RequestTeamEventTypes.PositionRequestDenied) {
                const e = event as RequestTeamEvent<RequestTeamEventTypes.PositionRequestDenied>;

                users.add(e.by)
            } else if (event.type == RequestTeamEventTypes.PositionRevoked) {
                const e = event as RequestTeamEvent<RequestTeamEventTypes.PositionRevoked>;
                users.add(e.by)
            }
        })

        // add users that have sent a chat message
        req.chat?.messages?.forEach(msg => {
            users.add(msg.userId)
        })

        return Array.from(users.values())
    }

    // TODO: pull this into common so backend can use the same logic
    computePositionScopedMetadata(
        teamEvents: RequestTeamEvent[], 
        position: Position,
        targetUserId: string,
        targetUserAttributes: CategorizedItem[],
        targetUserRoles: Role[],
        isRequestAdmin: boolean
    ): PositionScopedMetadata {
        
        const haveAllAttributes = position.attributes.every(attr => !!targetUserAttributes.find(userAttr => userAttr.categoryId == attr.categoryId && userAttr.itemId == attr.itemId));
        
        const haveRole =  (position.role == DefaultRoleIds.Anyone)
            || !!targetUserRoles.find(role => role.id == position.role);

        let haveBeenKicked = false;
        let waitingOnRequestResults = false; 
        let requestDenied = false;

        const pendingJoinRequests = new Set<string>();
        const deniedJoinRequests = new Set<string>();
        const unseenJoinRequests = new Set<string>();
        const joinedUsers = new Set<string>();

        // TODO: this can be optimized by analyzing the teamEvents for all positions in one iteration
        // by keeping track of the state for each position individually
        teamEvents.forEach(event => {
            // TODO: type gaurds to make this more ergo
            if (event.type == RequestTeamEventTypes.PositionJoined) {
                const e = event as RequestTeamEvent<RequestTeamEventTypes.PositionJoined>;

                if (e.position == position.id) {
                    joinedUsers.add(e.user)
                }
            } else if (event.type == RequestTeamEventTypes.PositionLeft) {
                const e = event as RequestTeamEvent<RequestTeamEventTypes.PositionLeft>;

                if (e.position == position.id) {
                    joinedUsers.delete(e.user)
                }
            } else if (event.type == RequestTeamEventTypes.PositionRevoked) {
                const e = event as RequestTeamEvent<RequestTeamEventTypes.PositionRevoked>;
                
                if (e.position == position.id) {

                    if (e.user == targetUserId) {
                        haveBeenKicked = true
                    }

                    joinedUsers.delete(e.user)
                }
            } else if (event.type == RequestTeamEventTypes.PositionRequested) {
                const e = event as RequestTeamEvent<RequestTeamEventTypes.PositionRequested>;

                if (e.position == position.id) {
                    if (e.requester == targetUserId) {
                        waitingOnRequestResults = true;
                    }

                    if (isRequestAdmin) {
                        unseenJoinRequests.add(e.requester)
                    }

                    pendingJoinRequests.add(e.requester)
                }
            } else if (event.type == RequestTeamEventTypes.PositionRequestDenied) {
                const e = event as RequestTeamEvent<RequestTeamEventTypes.PositionRequestDenied>;

                if (e.position == position.id) {
                    if (waitingOnRequestResults && e.requester == targetUserId) {
                        requestDenied = true;
                        waitingOnRequestResults = false;
                    }

                    if (isRequestAdmin) {
                        unseenJoinRequests.delete(e.requester)
                    }

                    pendingJoinRequests.delete(e.requester)
                    deniedJoinRequests.add(e.requester)
                }
            } else if (event.type == RequestTeamEventTypes.PositionRequestAccepted) {
                const e = event as RequestTeamEvent<RequestTeamEventTypes.PositionRequestAccepted>;

                if (e.position == position.id) {
                    if (waitingOnRequestResults && e.requester == targetUserId) {
                        requestDenied = false;
                        waitingOnRequestResults = false;
    
                        // request to join -> approved -> kicked -> request to join -> approved
                        haveBeenKicked = false;
                    }

                    if (isRequestAdmin) {
                        unseenJoinRequests.delete(e.requester)
                    }

                    joinedUsers.add(e.requester)
                    pendingJoinRequests.delete(e.requester)
                }
            } else if (event.type == RequestTeamEventTypes.PositionRequestSeen) {
                const e = event as RequestTeamEvent<RequestTeamEventTypes.PositionRequestSeen>;

                if (e.by == targetUserId && e.position == position.id) {
                    unseenJoinRequests.delete(e.requester)
                }
            } 
        })

        const canLeave = joinedUsers.has(targetUserId);
        const canJoin = haveAllAttributes && haveRole && !haveBeenKicked;
        const canRequestToJoin = !waitingOnRequestResults && !requestDenied;

        return {
            canJoin, 
            canLeave,
            canRequestToJoin,
            unseenJoinRequests,
            pendingJoinRequests,
            deniedJoinRequests,
            joinedUsers 
        }
    }

    getRequestsAfterSignin = async () => {
        await this.getRequests([], true);

        when(() => !userStore().signedIn, () => {
            when(() => userStore().signedIn, this.getRequestsAfterSignin)
        })
    }

    clear() {
        runInAction(() => {
            this.requests.clear();
            this.seenRequests.clear();
            this.seenRequestsToJoinRequest.clear();
            this.currentRequestIdStack = []
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
                // TODO: Do the definitiions/semantics of any filters change?
                // e.g. is there a filter that shows "Finished" and "Closed"?
                case HelpRequestFilter.Active:
                    return this.requestIsActive(r);
                case HelpRequestFilter.Finished:
                    return r.status == RequestStatus.Done;
                case HelpRequestFilter.Closed:
                    return r.status == RequestStatus.Closed;
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
    
    async getRequests(requestIds?: string[], skipUpdatingUsers?: boolean): Promise<void> {
        try {
            const oldCurrentReqId = this.currentRequest?.id;
            let possibleUpdatedCurrentReq:  HelpRequest;

            const requests = await api().getRequests(this.orgContext(), requestIds);

            const userIdSet = new Set<string>();

            for (const req of requests) {
                if (!skipUpdatingUsers) {
                    this.usersAssociatedWithRequest(req).forEach(id => userIdSet.add(id));
                }
                
                if (req.id == oldCurrentReqId) {
                    possibleUpdatedCurrentReq = req;
                }
            }

            if (!skipUpdatingUsers) {
                // TODO: might be worth having a common response type that returns 
                // related objects to save us a round trip call for this and other tings
                await userStore().updateOrgUsers(Array.from(userIdSet.values()));
            }

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

        const associatedUsers = this.usersAssociatedWithRequest(req);

        // TODO: might be worth having a common response type that returns 
        // related objects to save us a round trip call for this and other tings
        await userStore().updateOrgUsers(associatedUsers);

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

    async reopenRequest(requestId: string): Promise<void> {
        const req = await api().reopenRequest(this.requestContext(requestId));
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
        const unseenNotification = this.getRequestMetadata(requestId).unseenNotification;

        // team events say there aren't any unseen or we've seen it this session
        if (!unseenNotification || this.seenRequests.has(requestId)) {
            return;
        } else {
            this.seenRequests.add(requestId)
        }

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

    positionAckKey(userId: string, requestId: string, positionId: string) {
        return `${userId}-${requestId}-${positionId}`
    }

    joinRequestIsUnseen(userId: string, requestId: string, positionId: string) {
        const key = this.positionAckKey(userId, requestId, positionId)

        // we haven't seen it in this UI session && the teamEvents indicate we have an unseen notification
        return !this.seenRequestsToJoinRequest.has(key) //&& this.getRequestMetadata(requestId).unseenNotification
    }

    async ackRequestsToJoinNotification(requestId: string) {
        const request = this.requests.get(requestId);
        const unseenJoinRequests: { userId: string, positionId: string }[] = [];

        if (!request) {
            return // TODO: should this throw?
        }

        for (const pos of request.positions) {
            const posMeta = this.getPositionMetadata(request.id, pos.id);
            
            posMeta.unseenJoinRequests.forEach(requesterId => {
                if (this.joinRequestIsUnseen(requesterId, request.id, pos.id)) {
                    const key = this.positionAckKey(requesterId, requestId, pos.id)

                    this.seenRequestsToJoinRequest.add(key);
                    
                    unseenJoinRequests.push({
                        userId: requesterId, 
                        positionId: pos.id
                    })
                }
            })
        }

        if (unseenJoinRequests.length) {
            const updatedReq = await api().ackRequestsToJoinNotification(this.orgContext(), requestId, unseenJoinRequests);
        
            runInAction(() => {
                this.updateRequestInternals(updatedReq);
            })
        }
    }

    async approveRequestToJoinRequest(userId: string, requestId: string, positionId: string) {
        const updatedReq = await api().confirmRequestToJoinRequest(this.orgContext(), requestId, userId, positionId);
        
        runInAction(() => {
            this.updateRequestInternals(updatedReq);
            // handle case where: Request -> approve -> leave -> request
            // TODO: test this works as expected once the 404 fix is in
            this.seenRequestsToJoinRequest.delete(this.positionAckKey(userId, requestId, positionId))
        }) 
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
}