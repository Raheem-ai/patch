import { Notification, NotificationResponse } from 'expo-notifications';
import React from 'react';
import { Animated } from 'react-native';
import { ClientSideFormat } from '../../../common/api';
import { Location, NotificationPayload, NotificationType, Me, HelpRequest, ProtectedUser, RequestStatus, ResponderRequestStatuses, HelpRequestFilter, HelpRequestSortBy, AppSecrets, RequestSkill, TeamFilter, TeamSortBy, UserRole, MinUser, User } from '../../../common/models'
import { RootStackParamList } from '../types';

export interface IBaseStore {
    init?(): Promise<void>,
    // should this be clearUserData?
    clear(): void
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
    signUp(minUser: MinUser): Promise<void>
    signOut(): Promise<void>
    updateOrgUsers(userIds: string[]): Promise<void>
    toggleOnDuty(): Promise<void>
    inviteUserToOrg(email: string, phone: string, roles: UserRole[], baseUrl: string): Promise<void>
    signUpThroughOrg: (orgId: string, pendingId: string, user: MinUser) => Promise<void>
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
    toggleSelectAll(): Promise<void>;
    toggleIncludeOffDuty(): Promise<void>;
    toggleResponder(userId: string): Promise<void>;
    assignableResponders: ClientSideFormat<ProtectedUser>[]
    includeOffDuty: boolean
    selectAll: boolean
    selectedResponderIds: Set<string>
    selectedResponders: ClientSideFormat<ProtectedUser>[]
}

export type CreateReqData = Pick<HelpRequest, 'location' | 'type' | 'notes' | 'skills' | 'respondersNeeded'>

export interface ITempRequestStore extends CreateReqData {
    clear(prop?: keyof CreateReqData): void
}

export namespace ICreateRequestStore {
    export const id = Symbol('ICreateRequestStore');
}

export interface ICreateRequestStore extends ITempRequestStore {
    createRequest: () => Promise<void>;
}

export namespace IEditRequestStore {
    export const id = Symbol('IEditRequestStore');
}

export interface IEditRequestStore extends ITempRequestStore {
    loadRequest(req: CreateReqData): void
    editRequest(reqId: string): Promise<void>
}

export namespace IRequestStore {
    export const id = Symbol('IRequestStore');
}

export interface IRequestStore extends IBaseStore {
    requests: HelpRequest[]
    sortedRequests: HelpRequest[]
    currentRequest: HelpRequest
    currentRequestIdx: number
    activeRequest: HelpRequest
    loading: boolean

    filter: HelpRequestFilter
    sortBy: HelpRequestSortBy

    setSortBy(sortBy: HelpRequestSortBy): void
    setFilter(filter: HelpRequestFilter): Promise<void>
    getRequests(): Promise<void>
    pushRequest(requestId: string): Promise<void>
    tryPopRequest(): Promise<void>
    setCurrentRequest(request: HelpRequest): void;
    setRequestStatus(requestId: string, status: ResponderRequestStatuses): Promise<void>
    resetRequestStatus(requestId: string): Promise<void>
    updateChatReceipt(request: HelpRequest): Promise<void>
    sendMessage(request: HelpRequest, message: string): Promise<void>
    updateReq(updatedReq: HelpRequest): void
    confirmRequestAssignment(orgId: string, reqId: string): Promise<void>
    joinRequest(reqId: string): Promise<void>
    leaveRequest(reqId: string): Promise<void>
    removeUserFromRequest(userId: string, reqId: string): Promise<void>
}

export namespace ITeamStore {
    export const id = Symbol('ITeamStore');
}

export interface ITeamStore extends IBaseStore {
    sortedUsers: ClientSideFormat<ProtectedUser>[]
    
    loading: boolean

    filter: TeamFilter
    sortBy: TeamSortBy

    setSortBy(sortBy: TeamSortBy): void
    setFilter(filter: TeamFilter): Promise<void>
    refreshUsers(): Promise<void>
}

export interface ISecretStore extends IBaseStore, AppSecrets {
    googleMapsApiKey: string;
}

export namespace ISecretStore {
    export const id = Symbol('ISecretStore');
}

export interface IBottomDrawerStore extends IBaseStore {
    readonly bottomDrawerTabTop: Animated.Value
    expanded: boolean
    showing: boolean
    headerShowing: boolean
    minimizable: boolean
    viewId: BottomDrawerView
    view: BottomDrawerComponentClass
    currentRoute: string

    bottomUIOffset: number
    topUIOffset: number
    drawerContentHeight: number


    show(view: BottomDrawerView, expanded?: boolean): void;
    showHeader(): void;
    hide(): void// should this take an optional callback?
    hideHeader(): void;
    expand(): void
    minimize(): void
}

export namespace IBottomDrawerStore {
    export const id = Symbol('IBottomDrawerStore');
}

export enum BottomDrawerView {
    createRequest = 'cr',
    editRequest = 'er',
    requestChat = 'rc',
    assignResponders = 'ar',
    inviteUserToOrg ='iu'
}

export type BottomDrawerComponentClass = React.ComponentClass & {
    onHide?: () => void,
    onShow?: () => void,
    minimizeLabel?: string | (() => string),
    submit?: {
        label: string | (() => string),
        action: () => void
    }
    raisedHeader?: boolean | (() => boolean)
}

export type BottomDrawerConfig = { 
    [key in BottomDrawerView]: BottomDrawerComponentClass
}

// export const BottomDrawerHandleHeight = 56;
export const BottomDrawerHandleHeight = 64;

export interface INativeEventStore extends IBaseStore {
    keyboardHeight: number;
}

export namespace INativeEventStore {
    export const id = Symbol('INativeEventStore');
}

export interface IHeaderStore extends IBaseStore {
    isOpen: boolean;
    open(): void;
    close(): void;
}

export namespace IHeaderStore {
    export const id = Symbol('IHeaderStore');
}

export interface ILinkingStore extends IBaseStore {
    baseUrl: string
    initialRoute: keyof RootStackParamList;
    initialRouteParams: any
}

export namespace ILinkingStore {
    export const id = Symbol('ILinkingStore');
}

export type EditUserData = Omit<User, 'organizations' | 'id'>

export interface ITempUserStore extends EditUserData, IBaseStore { }

export namespace INewUserStore {
    export const id = Symbol('INewUserStore');
}

export interface INewUserStore extends ITempUserStore {
    roles: UserRole[]
    inviteNewUser: () => Promise<void>;
}

export namespace IEditUserStore {
    export const id = Symbol('IEditUserStore');
}

export interface IEditUserStore extends ITempUserStore {
    loadUser(user: EditUserData): void
    editUser(): Promise<void>
}

export const AllStores = [
    IUserStore,
    ILocationStore,
    INotificationStore,
    IDispatchStore,
    ICreateRequestStore,
    IRequestStore,
    ISecretStore,
    IEditRequestStore,
    IBottomDrawerStore,
    INativeEventStore,
    IHeaderStore,
    ITeamStore,
    ILinkingStore,
    INewUserStore
]