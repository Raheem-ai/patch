import { autorun, makeAutoObservable, ObservableMap, ObservableSet, reaction, runInAction, set, when } from 'mobx';
import { Store } from './meta';
import { bottomDrawerStore, IRequestStore, IUserStore, manageAttributesStore, navigationStore, organizationStore, PositionScopedMetadata, RequestMetadata, RequestScopedMetadata, userStore } from './interfaces';
import { ClientSideFormat, OrgContext, RequestContext } from '../../../common/api';
import { CategorizedItem, DefaultRoleIds, HelpRequest, HelpRequestFilter, HelpRequestSortBy, PatchEventType, PatchPermissions, Position, ProtectedUser, RequestStatus, RequestTeamEvent, RequestTeamEventTypes, ResponderRequestStatuses, Role } from '../../../common/models';
import { api } from '../services/interfaces';
import { persistent, securelyPersistent } from '../meta';
import { userHasAllPermissions } from '../utils';
import { usersAssociatedWithRequest } from '../../../common/utils/requestUtils';
import { resolvePermissionsFromRoles } from '../../../common/utils/permissionUtils';
import { navigationRef } from '../navigation';
import { routerNames } from '../types';

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
    }) requests: ObservableMap<string, HelpRequest> = new ObservableMap();

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
    }) seenRequestsToJoinRequest = new Set<string>(); //TODO: check if this needs to be an ObservableSet
    
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
        }).sort((a, b) => {
            return this.sortBySeverity(a, b)
        });
    }

    get orgUserRequestMetadata() {
        const map = new Map<string, Map<string, RequestMetadata>>()

        userStore().usersInOrg.forEach(user => {
            map.set(user.id, this.userRequestMetadata(user))
        })

        return map
    }

    userRequestMetadata(user: ClientSideFormat<ProtectedUser>) {
        const metadataMap = new Map<string, RequestMetadata>()

        const attributes = user.organizations[userStore().currentOrgId]?.attributes || [];
        const roles = organizationStore().userRoles.get(user.id)
        const isRequestAdmin = userHasAllPermissions(user.id, [PatchPermissions.RequestAdmin])

        this.requestsArray.forEach(req => {
            const posMap = new Map<string, PositionScopedMetadata>();

            req.positions.forEach(pos => {
                posMap.set(pos.id, this.computePositionScopedMetadata(req.teamEvents, pos, user.id, attributes, roles, isRequestAdmin))
            })
            
            const reqMeta = this.computeRequestScopedMetadata(req.teamEvents, user.id, isRequestAdmin);

            metadataMap.set(req.id, {
                positions: posMap,
                ...reqMeta
            })
        })

        return metadataMap
    }

    requestIsActive(request: HelpRequest) {
        return request.status != RequestStatus.Closed;
    }

    getRequestMetadata(userId: string, requestId: string): RequestMetadata {
        return this.orgUserRequestMetadata.get(userId)?.get(requestId)
    }

    getPositionScopedMetadata(userId: string, requestId: string, positionId: string): PositionScopedMetadata {
        return this.orgUserRequestMetadata.get(userId)?.get(requestId)?.positions.get(positionId);
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
            if (event.type == PatchEventType.RequestRespondersNotified) {
                const e = event as RequestTeamEvent<PatchEventType.RequestRespondersNotified>;
                
                if (e.to.includes(targetUserId)) {
                    unseenNotification = true
                }

                const timestamp = new Date(e.sentAt);

                e.to.forEach(notifiedUser => {
                    notificationsSentTo.set(notifiedUser, timestamp)
                })

            } else if (event.type == PatchEventType.RequestRespondersNotificationAck) {
                const e = event as RequestTeamEvent<PatchEventType.RequestRespondersNotificationAck>;
                
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

    // TODO: pull this into common so backend can use the same logic
    computePositionScopedMetadata(
        teamEvents: RequestTeamEvent[], 
        position: Position,
        targetUserId: string,
        targetUserAttributes: CategorizedItem[],
        targetUserRoles: Role[],
        isRequestAdmin: boolean
    ): PositionScopedMetadata {
        
        const haveAllAttributes = position.attributes.every(attr => {
            const isValidAttr = !!manageAttributesStore().getAttribute(attr.categoryId, attr.itemId)
            // either attr isn't valid or user has it 
            return !isValidAttr || !!targetUserAttributes.find(userAttr => userAttr.categoryId == attr.categoryId && userAttr.itemId == attr.itemId);
        });
        
        const haveRole =  (position.role == DefaultRoleIds.Anyone)
            || !!targetUserRoles.find(role => role.id == position.role);

        const userPermissions = resolvePermissionsFromRoles(targetUserRoles)
        const canEditRequests = userPermissions.has(PatchPermissions.EditRequestData)

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
            if (event.type == PatchEventType.RequestRespondersJoined) {
                const e = event as RequestTeamEvent<PatchEventType.RequestRespondersJoined>;

                if (e.position == position.id) {
                    joinedUsers.add(e.user)
                }
            } else if (event.type == PatchEventType.RequestRespondersLeft) {
                const e = event as RequestTeamEvent<PatchEventType.RequestRespondersLeft>;

                if (e.position == position.id) {
                    joinedUsers.delete(e.user)
                }
            } else if (event.type == PatchEventType.RequestRespondersRemoved) {
                const e = event as RequestTeamEvent<PatchEventType.RequestRespondersRemoved>;
                
                if (e.position == position.id) {

                    if (e.user == targetUserId) {
                        haveBeenKicked = true
                    }

                    joinedUsers.delete(e.user)
                }
            } else if (event.type == PatchEventType.RequestRespondersRequestToJoin) {
                const e = event as RequestTeamEvent<PatchEventType.RequestRespondersRequestToJoin>;

                if (e.position == position.id) {
                    if (e.requester == targetUserId) {
                        waitingOnRequestResults = true;
                    }

                    if (isRequestAdmin) {
                        unseenJoinRequests.add(e.requester)
                    }

                    pendingJoinRequests.add(e.requester)
                }
            } else if (event.type == PatchEventType.RequestRespondersDeclined) {
                const e = event as RequestTeamEvent<PatchEventType.RequestRespondersDeclined>;

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
            } else if (event.type == PatchEventType.RequestRespondersAccepted) {
                const e = event as RequestTeamEvent<PatchEventType.RequestRespondersAccepted>;

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
            } else if (event.type == PatchEventType.RequestRespondersRequestToJoinAck) {
                const e = event as RequestTeamEvent<PatchEventType.RequestRespondersRequestToJoinAck>;

                if (e.by == targetUserId && e.position == position.id) {
                    unseenJoinRequests.delete(e.requester)
                }
            } 
        })

        const canLeave = joinedUsers.has(targetUserId) && canEditRequests;
        const canJoin = haveAllAttributes && haveRole && !haveBeenKicked && canEditRequests;
        const canRequestToJoin = !waitingOnRequestResults && canEditRequests;

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
                case HelpRequestSortBy.BySeverity:
                    return this.sortBySeverity(a, b)
            }
        })
    }

    get filteredSortedRequestsWithLocation(): HelpRequest[] {
        return this.filteredSortedRequests.filter(req => !!req.location);
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

    sortBySeverity = (a: HelpRequest, b: HelpRequest): number => {
        const aPri = a.priority ? a.priority : 0;
        const bPri = b.priority ? b.priority : 0;

        return aPri == bPri
            ? 0
            : aPri > bPri
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
        this.currentRequestIdStack.push(requestId);
    }

    async loadUntil(predicate: () => Promise<any>) {
        this.loading = true
        await predicate()
        runInAction(() => this.loading = false)
    }
    
    async getRequests(requestIds?: string[], skipUpdatingUsers?: boolean): Promise<void> {
        try {
            const oldCurrentReqId = this.currentRequest?.id;
            let possibleUpdatedCurrentReq:  HelpRequest;

            const requests = await api().getRequests(this.orgContext(), requestIds);

            const userIdSet = new Set<string>();

            for (const req of requests) {
                if (!skipUpdatingUsers) {
                    usersAssociatedWithRequest(req).forEach(id => userIdSet.add(id));
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

        const associatedUsers = usersAssociatedWithRequest(req);

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

    async closeRequest(requestId: string): Promise<void> {
        const req = await api().closeRequest(this.requestContext(requestId));
        this.updateOrAddReq(req);
    }

    async reopenRequest(requestId: string): Promise<void> {
        const req = await api().reopenRequest(this.requestContext(requestId));
        this.updateOrAddReq(req);
    }

    async updateChatReceipt(request: HelpRequest): Promise<void> {
        const chat = request.chat;

        if (!chat) {
            return
        }

        const usersLastMessageId = chat.userReceipts?.[userStore().user.id];
        const userHasSeenChat = !!usersLastMessageId;
        const userHasUnreadMessages = !userHasSeenChat || chat.lastMessageId > usersLastMessageId

        if (userHasUnreadMessages) {
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
        const unseenNotification = this.orgUserRequestMetadata.get(userStore().user.id)?.get(requestId)?.unseenNotification;

        // team events say there aren't any unseen or we've seen it this session
        if (!unseenNotification || this.seenRequests.has(requestId)) {
            return;
        } else {
            this.seenRequests.add(requestId)
        }

        const updatedReq = await api().ackRequestNotification(this.orgContext(), requestId);
        
        this.updateOrAddReq(updatedReq);
    }

    async joinRequest(requestId: string, positionId: string) {
        const updatedReq = await api().joinRequest(this.orgContext(), requestId, positionId);
        this.updateOrAddReq(updatedReq)
    }

    async leaveRequest(requestId: string, positionId: string) {
        const updatedReq = await api().leaveRequest(this.orgContext(), requestId, positionId);
        this.updateOrAddReq(updatedReq)
    }

    async requestToJoinRequest(requestId: string, positionId: string) {
        const updatedReq = await api().requestToJoinRequest(this.orgContext(), requestId, positionId);
        this.updateOrAddReq(updatedReq);
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
            const posMeta = this.getPositionScopedMetadata(userStore().user.id, request.id, pos.id);
            
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
                this.updateOrAddReq(updatedReq);
            })
        }
    }

    async approveRequestToJoinRequest(userId: string, requestId: string, positionId: string) {
        const updatedReq = await api().confirmRequestToJoinRequest(this.orgContext(), requestId, userId, positionId);
        
        runInAction(() => {
            this.updateOrAddReq(updatedReq);
            // handle case where: Request -> approve -> leave -> request
            // TODO: test this works as expected once the 404 fix is in
            this.seenRequestsToJoinRequest.delete(this.positionAckKey(userId, requestId, positionId))
        }) 
    }

    async denyRequestToJoinRequest(userId: string, requestId: string, positionId: string) {
        const updatedReq = await api().declineRequestToJoinRequest(this.orgContext(), requestId, userId, positionId);
        this.updateOrAddReq(updatedReq);
    }

    async removeUserFromRequest(userId: string, requestId: string, positionId: string) {
        const updatedReq = await api().removeUserFromRequest(this.orgContext(), userId, requestId, positionId);
        this.updateOrAddReq(updatedReq);
    }

    updateOrAddReq(updatedReq: HelpRequest) {
        this.requests.merge({
            [updatedReq.id]: updatedReq
        })
    }

    async deleteRequest(requestId: string) {

        bottomDrawerStore().startSubmitting();

        await api().deleteRequest(this.orgContext(), requestId);

        await navigationStore().navigateToSync(routerNames.helpRequestList);
        
        bottomDrawerStore().endSubmitting();

        await bottomDrawerStore().hideSync(); 
    
        runInAction(() => {
            console.log("inside run in action");
            this.currentRequestId = null;
            this.requests.delete(requestId);
        });
    }

    async onRequestDeletedUpdate(requestId: string) {
        
        
        // if user is on the request details page, hide the drawer
        if(bottomDrawerStore().expanded){
            await bottomDrawerStore().hideSync(); 
        } 
        
        // if user is on request details, go to request list
        if (navigationStore().currentRoute === routerNames.helpRequestDetails){
            navigationStore().navigateToSync(routerNames.helpRequestList);
        }

        runInAction(() => {
            this.currentRequestId = null;
            this.requests.delete(requestId);
        });
        
    }
}