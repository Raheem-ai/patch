import { Notification, NotificationResponse } from 'expo-notifications';
import React from 'react';
import { Animated } from 'react-native';
import { ClientSideFormat } from '../../../common/api';
import { Location, NotificationPayload, NotificationType, Me, HelpRequest, ProtectedUser, RequestStatus, ResponderRequestStatuses, HelpRequestFilter, HelpRequestSortBy, AppSecrets, RequestSkill, TeamFilter, TeamSortBy, UserRole, MinUser, User, EditableUser, EditableMe, PendingUser, PatchUIEventPacket, OrganizationMetadata, Role, PatchPermissions, AttributeCategory, Attribute, TagCategory, Tag, AttributesMap, Category, AdminEditableUser, CategorizedItem } from '../../../common/models'
import { RootStackParamList } from '../types';
import { getStore } from './meta';

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
    users: Map<string, ClientSideFormat<ProtectedUser>>
    usersInOrg: ClientSideFormat<ProtectedUser>[]
    currentUser: ClientSideFormat<ProtectedUser>
    loadingCurrentUser: boolean

    signIn(email: string, password: string): Promise<void>
    signUp(minUser: MinUser): Promise<void>
    signOut(): Promise<void>
    onSignOut: (route?: keyof RootStackParamList) => void

    updateOrgUsers(userIds: string[]): Promise<void>
    toggleOnDuty(): Promise<void>
    inviteUserToOrg(email: string, phone: string, roles: UserRole[], roleIds: string[], attributes: CategorizedItem[], skills: RequestSkill[], baseUrl: string): Promise<PendingUser>
    signUpThroughOrg: (orgId: string, pendingId: string, user: MinUser) => Promise<void>
    pushCurrentUser: (user: ClientSideFormat<ProtectedUser>) => void;
    removeCurrentUserFromOrg: () => Promise<void>
    removeMyselfFromOrg: () => Promise<void>
    editUser: (userId: string, user: Partial<AdminEditableUser>) => Promise<void>
    editMe: (user: Partial<EditableMe>, protectedUser?: Partial<AdminEditableUser>) => Promise<void>
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

export type CreateReqData = Pick<HelpRequest, 
    'location' 
    | 'type' 
    | 'notes' 
    | 'positions' 
    | 'callStartedAt' 
    | 'callEndedAt' 
    | 'callerName' 
    | 'callerContactInfo' 
    | 'priority'
    | 'tagHandles'
>

export interface ITempRequestStore extends CreateReqData {
    clear(prop?: keyof CreateReqData): void
}

export namespace ICreateRequestStore {
    export const id = Symbol('ICreateRequestStore');
}

export interface ICreateRequestStore extends ITempRequestStore {
    createRequest: () => Promise<HelpRequest>;
    locationValid: boolean
    typeValid: boolean
}

export namespace IEditRequestStore {
    export const id = Symbol('IEditRequestStore');
}

export interface IEditRequestStore extends ITempRequestStore {
    loadRequest(req: CreateReqData): void
    editRequest(reqId: string): Promise<void>
    locationValid: boolean
    typeValid: boolean
}

export namespace IRequestStore {
    export const id = Symbol('IRequestStore');
}

export type PositionScopedMetadata = {
    pendingJoinRequests: Set<string>,
    deniedJoinRequests: Set<string>
    /** this should mirror what's on the position but we might be able to remove 
     * the field from position in favor of this 
     */
    joinedUsers: Set<string>
} & UserSpecificPositionMetadata;

/**
 * relative to the current user
 */
export type UserSpecificPositionMetadata = {
    canJoin: boolean,
    canLeave: boolean,
    canRequestToJoin: boolean,
    /**
     * if current user isn't a request adming this is empty
     */ 
    unseenJoinRequests: Set<string>,
}

export type RequestScopedMetadata = {
    unseenNotification: boolean,
    notificationsSentTo: Map<string, Date>
    notificationsViewedBy: Map<string, Date>
}

// this type is always in the context of being relative to a single user
// ie.
// frontend: always relative to the user logged in
// backend: always relative to the user being checked against in the api call
export type RequestMetadata = RequestScopedMetadata & {
    positions: Map<string, PositionScopedMetadata>
};

export interface IRequestStore extends IBaseStore {
    requests: Map<string, HelpRequest>
    requestsArray: HelpRequest[]
    filteredSortedRequests: HelpRequest[]
    currentRequest: HelpRequest
    currentRequestId: string
    activeRequest: HelpRequest
    activeRequests: HelpRequest[]
    myActiveRequests: HelpRequest[]
    currentUserActiveRequests: HelpRequest[]
    loading: boolean
    requestMetadata:  Map<string, RequestMetadata>

    filter: HelpRequestFilter
    sortBy: HelpRequestSortBy

    setSortBy(sortBy: HelpRequestSortBy): void
    setFilter(filter: HelpRequestFilter): Promise<void>
    getRequests(requestIds?: string[]): Promise<void>
    getRequest(requestId: string): Promise<void>
    pushRequest(requestId: string): Promise<void>
    tryPopRequest(): Promise<void>
    setCurrentRequest(request: HelpRequest): void;
    setRequestStatus(requestId: string, status: ResponderRequestStatuses): Promise<void>
    resetRequestStatus(requestId: string): Promise<void>
    reopenRequest(requestId: string): Promise<void>
    updateChatReceipt(request: HelpRequest): Promise<void>
    sendMessage(request: HelpRequest, message: string): Promise<void>
    updateOrAddReq(updatedReq: HelpRequest): void
    
    joinRequest(reqId: string, positionId: string): Promise<void>
    leaveRequest(reqId: string, positionId: string): Promise<void>
    requestToJoinRequest(reqId: string, positionId: string): Promise<void>
    removeUserFromRequest(userId: string, reqId: string, positionId: string): Promise<void>
    getPositionMetadata(requestId: string, positionId: string): PositionScopedMetadata
    
    approveRequestToJoinRequest(userId: string, requestId: string, positionId: string): Promise<void>
    denyRequestToJoinRequest(userId: string, requestId: string, positionId: string): Promise<void>
    ackRequestsToJoinNotification(requestId: string): Promise<void>
    joinRequestIsUnseen(userId: string, requestId: string, positionId: string): boolean
    ackRequestNotification(requestId: string): Promise<void>
}

export type EditOrganizationData = Pick<OrganizationMetadata, 'name' | 'roleDefinitions' | 'attributeCategories' | 'tagCategories'>

export interface ITempOrganizationStore extends EditOrganizationData {
    clear(prop?: keyof EditOrganizationData): void
}

export namespace IEditOrganizationStore {
    export const id = Symbol('IEditOrganizationStore');
}

export interface IEditOrganizationStore extends ITempOrganizationStore {
    // Organization Metadata
    name: string
    roleDefinitions: Role[]
    attributeCategories: AttributeCategory[]
    tagCategories: TagCategory[]

    // Edit Attribute Category
    currentAttributeCategoryName: string
    currentAttributeCategoryAttributes: Attribute[]

    // Edit Attribute
    currentAttributeName: string

    // Edit Tag Category
    currentTagCategoryName: string
    currentTagCategoryTags: Tag[]

    // Edit Tag
    currentTagName: string

    editOrganization(orgId: string): Promise<OrganizationMetadata>

    createNewAttributeCategory(): Promise<AttributeCategory>
    editAttributeCategory(categoryId: string): Promise<AttributeCategory>
    deleteAttributeCategory(categoryId: string): Promise<OrganizationMetadata>

    createNewAttribute(categoryId: string): Promise<Attribute>
    editAttribute(categoryId: string, attributeId: string): Promise<Attribute>
    deleteAttribute(categoryId: string, attributeId: string): Promise<OrganizationMetadata>

    createNewTagCategory(): Promise<TagCategory>
    editTagCategory(categoryId: string): Promise<TagCategory>
    deleteTagCategory(categoryId: string): Promise<OrganizationMetadata>

    createNewTag(categoryId: string): Promise<Tag>
    editTag(categoryId: string, tagId: string): Promise<Tag>
    deleteTag(categoryId: string, tagId: string): Promise<OrganizationMetadata>
}

export namespace IOrganizationStore {
    export const id = Symbol('IOrganizationStore');
}

export interface IOrganizationStore extends IBaseStore {
    metadata: OrganizationMetadata
    requestPrefix: string
    roles: Map<string, Role> 
    userRoles: Map<string, Role[]>
    userPermissions: Map<string, Set<PatchPermissions>>
    isReady: boolean

    getOrgData(): Promise<void>;
    updateOrgData(updatedOrg: OrganizationMetadata): void
    updateOrAddRole(updatedRole: Role): void
    updateOrAddAttributeCategory(updatedCategory: AttributeCategory): void
    updateOrAddAttribute(categoryId: string, updatedAttribute: Attribute): void
    updateOrAddTagCategory(updatedCategory: TagCategory): void
    updateOrAddTag(categoryId: string, updatedTag: Tag): void
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

    drawerContentHeight: Animated.AnimatedInterpolation
    contentHeight: Animated.AnimatedInterpolation

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
    assignResponders = 'ar',
    inviteUserToOrg ='iu',
    editMe = 'em',
    editUser = 'eu',
}

export type BottomDrawerComponentClass = React.ComponentClass & {
    onHide?: () => void,
    onShow?: () => void,
    minimizeLabel?: string | (() => string),
    submit?: {
        isValid: () => boolean
        label: string | (() => string),
        action: () => Promise<void>
    }
    raisedHeader?: boolean | (() => boolean)
}

export type BottomDrawerConfig = { 
    [key in BottomDrawerView]: BottomDrawerComponentClass
}

// export const BottomDrawerHandleHeight = 56;
export const BottomDrawerHandleHeight = 64;

export interface INativeEventStore extends IBaseStore {
    readonly keyboardHeight: number;
    keyboardOpen: boolean;
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

    call: (phone: string) => Promise<void>
    mailTo: (phone: string) => Promise<void>
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
    roleIds: string[]
    attributes: CategorizedItem[]

    isValid: boolean
    phoneValid: boolean
    emailValid: boolean
    skillsValid: boolean
    rolesValid: boolean
    
    inviteNewUser: () => Promise<PendingUser>;
}

export namespace IEditUserStore {
    export const id = Symbol('IEditUserStore');
}

export interface IEditUserStore extends ITempUserStore {
    roles: string[]
    attributes: CategorizedItem[]
    id: string;

    myChangesValid: boolean
    userChangesValid: boolean
    nameValid: boolean
    phoneValid: boolean
    emailValid: boolean
    passwordValid: boolean
    displayColorValid: boolean
    raceValid: boolean
    bioValid: boolean
    skillsValid: boolean
    rolesValid: boolean
    pronounsValid: boolean

    loadMe(user: Me): void
    loadUser(user: ClientSideFormat<ProtectedUser>): void

    editMe: () => Promise<void>;
    editUser: () => Promise<void>;
}

export namespace IAlertStore {
    export const id = Symbol('IAlertStore');
}

type PromptAction = {
    label: string,
    onPress: () => void
    confirming?: boolean
}

export type PromptConfig = {
    title: string,
    message: string,
    actions: [PromptAction] | [PromptAction, PromptAction]
}

export type ToastConfig = {
    message: string,
    dismissable?: boolean,
    type: 'success' | 'error'
}

export interface IAlertStore extends IBaseStore {
    toast?: ToastConfig
    prompt?: PromptConfig
    
    toastSuccess(message: string, dismissable?: boolean): void;
    toastError(message: string, dismissable?: boolean): void;

    showPrompt(config: PromptConfig): void
    hidePrompt(): void
}

export namespace ISocketStore {
    export const id = Symbol('ISocketStore');
}

export interface ISocketStore extends IBaseStore {

}

export namespace IUpdateStore {
    export const id = Symbol('IUpdateStore');
}

export interface IUpdateStore extends IBaseStore {
    onUIEvent(packet: PatchUIEventPacket) : Promise<void>
}

export namespace IUpsertRoleStore {
    export const id = Symbol('IUpsertRoleStore');
}

// TODO: rename this to IManageRoleStore
export interface IUpsertRoleStore extends Role, IBaseStore { 
    loadRole: (role: Role) => void
    save: () => Promise<void>
    delete: () => Promise<void>
    nameIsValid: () => boolean
}

export namespace IEditCategorizedItemStore {
    export const id = Symbol('IEditCategorizedItemStore');
}

export interface IEditCategorizedItemStore extends IBaseStore {
    categories: Map<string, Category>
    definedCategories: Map<string, Category>

    addCategory: (categoryName: string) => void
    editCategory: (categoryId: string, categoryName: string) => void
    removeCategory: (categoryId: string) => void

    addItemToCategory: (categoryId: string, itemName: string) => void
    editItem: (categoryId: string, itemId: string, itemName: string) => void
    removeItemFromCategory: (categoryId: string, itemId: string) => void

    save: () => Promise<void>
}

export namespace ISelectCategorizedItemStore {
    export const id = Symbol('ISelectCategorizedItemStore');
}

export interface ISelectCategorizedItemStore {
    // categories: Map<string, Category>
    selectedItems: Map<string, string[]>

    toggleItem: (categoryId: string, itemId: string) => void
}

export namespace IManageTagsStore {
    export const id = Symbol('IManageTagsStore');
}

export namespace IManageAttributesStore {
    export const id = Symbol('IManageAttributesStore');
}

export interface INavigationStore extends IBaseStore {
    currentRoute: keyof RootStackParamList;

    navigateToSync: (targetRoute) => Promise<void>
}

export namespace INavigationStore {
    export const id = Symbol('INavigationStore');
}

interface CategorizedItemStore extends IBaseStore { 
    editPermissions: PatchPermissions[]
    editStore: IEditCategorizedItemStore 
};

export interface IManageTagsStore extends CategorizedItemStore {
    tagCategories: Map<string, Category>
    getTag(categoryId: string, tagId: string): Tag
};

export interface IManageAttributesStore extends CategorizedItemStore {
    attributeCategories: Map<string, Category>
    getAttribute(categoryId: string, attributeId: string): Attribute
};

export const userStore = () => getStore<IUserStore>(IUserStore);
export const locationStore = () => getStore<ILocationStore>(ILocationStore);
export const notificationStore = () => getStore<INotificationStore>(INotificationStore);
export const dispatchStore = () => getStore<IDispatchStore>(IDispatchStore);
export const createRequestStore = () => getStore<ICreateRequestStore>(ICreateRequestStore);
export const editRequestStore = () => getStore<IEditRequestStore>(IEditRequestStore);
export const requestStore = () => getStore<IRequestStore>(IRequestStore);
export const editOrganizationStore = () => getStore<IEditOrganizationStore>(IEditOrganizationStore);
export const organizationStore = () => getStore<IOrganizationStore>(IOrganizationStore);
export const teamStore = () => getStore<ITeamStore>(ITeamStore);
export const secretStore = () => getStore<ISecretStore>(ISecretStore);
export const bottomDrawerStore = () => getStore<IBottomDrawerStore>(IBottomDrawerStore);
export const nativeEventStore = () => getStore<INativeEventStore>(INativeEventStore);
export const headerStore = () => getStore<IHeaderStore>(IHeaderStore);
export const linkingStore = () => getStore<ILinkingStore>(ILinkingStore);
export const newUserStore = () => getStore<INewUserStore>(INewUserStore);
export const editUserStore = () => getStore<IEditUserStore>(IEditUserStore);
export const alertStore = () => getStore<IAlertStore>(IAlertStore);
export const socketStore = () => getStore<ISocketStore>(ISocketStore);
export const updateStore = () => getStore<IUpdateStore>(IUpdateStore);
export const upsertRoleStore = () => getStore<IUpsertRoleStore>(IUpsertRoleStore);
export const manageTagsStore = () => getStore<IManageTagsStore>(IManageTagsStore);
export const manageAttributesStore = () => getStore<IManageAttributesStore>(IManageAttributesStore);
export const navigationStore = () => getStore<INavigationStore>(INavigationStore);

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
    INewUserStore,
    IEditUserStore,
    IAlertStore,
    ISocketStore,
    IUpdateStore,
    IOrganizationStore,
    IEditOrganizationStore,
    IUpsertRoleStore,
    IManageAttributesStore,
    IManageTagsStore,
    INavigationStore
]
