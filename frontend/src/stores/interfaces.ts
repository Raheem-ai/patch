import { Notification, NotificationResponse } from 'expo-notifications';
import { ClientSideFormat } from '../../../common/api';
import { User, Location, NotificationPayload, NotificationType, Me, HelpRequest, ProtectedUser, RequestStatus, ResponderRequestStatuses, HelpRequestFilter, HelpRequestSortBy } from '../../../common/models'

export interface IBaseStore {
    init?(): Promise<void>
}

export interface IUserStore extends IBaseStore {
    user: ClientSideFormat<Me>;
    signedIn: boolean;
    authToken: string;
    isResponder: boolean;
    isDispatcher: boolean;
    isAdmin: boolean;
    isOnDuty: boolean;
    currentOrgId: string;
    usersInOrg: Map<string, ClientSideFormat<ProtectedUser>>
    signIn(email: string, password: string): Promise<void>
    signUp(email: string, password: string): Promise<void>
    signOut(): Promise<void>
    updateOrgUsers(userIds: string[]): Promise<void>
    toggleOnDuty(): Promise<void>
}

export namespace IUserStore {
    export const id = Symbol('IUserStore');
}

export interface ILocationStore extends IBaseStore {
    hasForegroundPermission: boolean
    hasBackgroundPermission: boolean 
    hasFullPermission: boolean 
    lastKnownLocation: Location
    foregroundCallbacks: ((loc: Location) => void)[]

    askForPermission(): Promise<boolean>
    getCurrentLocation(): Promise<Location>
    startWatchingLocation(): Promise<void>
    stopWatchingLocation(): Promise<void>
    addForegroundCallback(cb: (loc: Location) => Promise<void> | void): string;
    removeForegroundCallback(handle: string): void;
    reportLocation(token: string, locations: Location[]): Promise<void>;
}

export namespace ILocationStore {
    export const id = Symbol('ILocationStore')
    export const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK'
    export const SHIFT_END_TIME = 'SHIFT_END_TIME'
}


export interface INotificationStore extends IBaseStore {
    // hasPermission: boolean;
    setup(): void;
    teardown(): void;
    askForPermission(): Promise<boolean> 
    updatePushToken(): Promise<void>;
    onNotification<T extends NotificationType>(type: T, cb: (data: NotificationPayload<T>, notification: Notification) => void): [T, string];
    offNotification<T extends NotificationType>(params: [T,string]);
    onNotificationResponse<T extends NotificationType>(type: T, cb: (data: NotificationPayload<T>, res: NotificationResponse) => void): [T, string];
    offNotificationResponse<T extends NotificationType>(params: [T, string]);
    handlePermissions(): Promise<void>
}

export namespace INotificationStore {
    export const id = Symbol('INotificationStore');
    export const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK'
}

export namespace IDispatchStore {
    export const id = Symbol('IDispatchStore');
}

export interface IDispatchStore extends IBaseStore {
    broadcastRequest(requestId: string, to: string[]): Promise<void>
    assignRequest(requestId: string, to: string[]): Promise<void>
}

export namespace ICreateRequestStore {
    export const id = Symbol('ICreateRequestStore');
}

export type CreateReqData = Pick<HelpRequest, 'location' | 'type' | 'notes' | 'skills' | 'respondersNeeded'>

export interface ICreateRequestStore extends CreateReqData {
    createRequest: () => Promise<void>;
    clear(prop?: keyof CreateReqData): void
}

export namespace IRequestStore {
    export const id = Symbol('IRequestStore');
}

export interface IRequestStore extends IBaseStore {
    requests: HelpRequest[]
    sortedRequests: HelpRequest[]
    currentRequest: HelpRequest
    currentRequestIdx: number

    filter: HelpRequestFilter
    sortBy: HelpRequestSortBy

    setSortBy(sortBy: HelpRequestSortBy): void
    setFilter(filter: HelpRequestFilter): Promise<void>
    getRequests(): Promise<void>
    getRequest(requestId: string): Promise<void>
    setCurrentRequest(request: HelpRequest): void;
    setRequestStatus(requestId: string, status: ResponderRequestStatuses): Promise<void>
    updateChatReceipt(request: HelpRequest): Promise<void>
    sendMessage(request: HelpRequest, message: string): Promise<void>
}
