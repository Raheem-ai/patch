import { Notification, NotificationResponse } from 'expo-notifications';
import React from 'react';
import { Animated, TextStyle } from 'react-native';
import { Camera } from 'react-native-maps';
import { ClientSideFormat } from '../../../common/api';
import { Location, Me, HelpRequest, ProtectedUser, ResponderRequestStatuses, HelpRequestFilter, HelpRequestSortBy, AppSecrets, TeamFilter, TeamSortBy, UserRole, MinUser, User, EditableUser, EditableMe, PendingUser, OrganizationMetadata, Role, PatchPermissions, AttributeCategory, Attribute, TagCategory, Tag, AttributesMap, Category, AdminEditableUser, CategorizedItem, StatusOption, EligibilityOption, PatchEventPacket, PatchNotification, IndividualRequestEventType, CategorizedItemUpdates, ArrayCollectionUpdate, RequestType, PositionSetUpdate, DynamicConfig, Shift, ShiftOccurrence, ShiftsFilter, DateTimeRange, ShiftNeedsPeopleFilter, PositionStatus, ShiftsRolesFilter, ShiftStatus, CalendarDaysFilter, ShiftOccurrenceMetadata, WithoutDates } from '../../../common/models'
import { FormInputViewMap } from '../components/forms/types';
import { RootStackParamList } from '../types';
import { getStore } from './meta';

export interface IBaseStore {
    // we can have this be optional because the @Store() decorator
    // adds an init() impl even if the store doesn't have its own setup
    init?(): Promise<void>,
    // should this be clearUserData?
    clear(): void
}

export interface IUserStore extends IBaseStore {
    user: ClientSideFormat<Me>;
    signedIn: boolean;
    passwordResetLoginCode: string;
    authToken: string;
    isOnDuty: boolean;
    currentOrgId: string;
    users: Map<string, ClientSideFormat<ProtectedUser>>
    usersInOrg: ClientSideFormat<ProtectedUser>[]
    usersRemovedFromOrg: ClientSideFormat<ProtectedUser>[]
    deletedUsers: Set<string>;
    currentUser: ClientSideFormat<ProtectedUser>
    loadingCurrentUser: boolean

    signIn(email: string, password: string): Promise<void>
    updatePassword(password: string): Promise<void>
    sendResetCode(email: string, baseUrl: string): Promise<void>
    signInWithCode(code: string): Promise<void>
    signUp(minUser: MinUser): Promise<void>
    signOut(): Promise<void>
    onSignOut: (route?: keyof RootStackParamList) => void
    deleteMyAccount(): Promise<void>

    updateOrgUsers(userIds: string[]): Promise<void>
    toggleOnDuty(): Promise<void>
    inviteUserToOrg(email: string, phone: string, roleIds: string[], attributes: CategorizedItem[], baseUrl: string): Promise<PendingUser>
    signUpThroughOrg: (orgId: string, pendingId: string, user: MinUser) => Promise<void>
    pushCurrentUser: (user: ClientSideFormat<ProtectedUser>) => void;
    removeCurrentUserFromOrg: () => Promise<void>
    removeMyselfFromOrg: () => Promise<void>
    editUser: (userId: string, user: Partial<AdminEditableUser>) => Promise<void>
    editMe: (user: Partial<EditableMe>, protectedUser?: Partial<AdminEditableUser>) => Promise<void>

    userInOrg: (user: Pick<User, 'organizations'>) => boolean
}

export namespace IUserStore {
    export const id = Symbol('IUserStore');
}

export interface ILocationStore extends IBaseStore {
    hasForegroundPermission: boolean
    hasBackgroundPermission: boolean 
    hasFullPermission: boolean 
    lastKnownLocation: Location
    defaultCamera: Camera
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
    handlePermissions(): Promise<void>
    onEvent(patchNotification: PatchNotification) : Promise<void>
    handleNotification(notification: Notification): Promise<void>
}

export namespace INotificationStore {
    export const id = Symbol('INotificationStore');
    export const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK'
}

export namespace IDispatchStore {
    export const id = Symbol('IDispatchStore');
}

export interface IDispatchStore extends IBaseStore {
    assignRequest(requestId: string, to: string[]): Promise<void>
    toggleSelectAll(): Promise<void>;
    toggleResponder(userId: string): Promise<void>;

    assignableResponders: ClientSideFormat<ProtectedUser>[]
    selectAll: boolean
    selectedResponderIds: Set<string>
    selectedResponders: ClientSideFormat<ProtectedUser>[]

    roleOption: string
    statusOption: StatusOption
    eligibilityOption: EligibilityOption

    roleOptions: string[]
    statusOptions: StatusOption[]
    eligibilityOptions: EligibilityOption[]

    setRoleOption(roleId: string): void
    setStatusOption(statusOpt: StatusOption): void
    setEligibilityOption(eOpt: EligibilityOption): void

    roleOptionToHeaderLabel(roleId: string): string
    statusOptionToHeaderLabel(statusOpt: StatusOption): string
    eligibilityOptionToHeaderLabel(eOpt: EligibilityOption): string

    roleOptionToOptionLabel(roleId: string): string
    statusOptionToOptionLabel(statusOpt: StatusOption): string
    eligibilityOptionToOptionLabel(eOpt: EligibilityOption): string
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
    // react to deletions that might affect the locally cached data this store is using
    onRoleDeletedUpdate(roleId: string): void
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
    loadRequest(reqId: string): void
    editRequest(): Promise<void>
    locationValid: boolean
    typeValid: boolean

    saveTypeUpdates(diff: ArrayCollectionUpdate<RequestType>)
    saveTagUpdates(diff: ArrayCollectionUpdate<CategorizedItem>)
    savePositionUpdates(diff: PositionSetUpdate)
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
    filteredSortedRequestsWithLocation: HelpRequest[]
    currentRequest: HelpRequest
    currentRequestId: string
    activeRequest: HelpRequest
    activeRequests: HelpRequest[]
    myActiveRequests: HelpRequest[]
    currentUserActiveRequests: HelpRequest[]
    loading: boolean
    // requestMetadata:  Map<string, RequestMetadata>

    filter: HelpRequestFilter
    sortBy: HelpRequestSortBy

    loadUntil(predicate: () => Promise<any>): Promise<void>
    setSortBy(sortBy: HelpRequestSortBy): void
    setFilter(filter: HelpRequestFilter): Promise<void>
    getRequests(requestIds?: string[]): Promise<void>
    getRequest(requestId: string): Promise<void>
    pushRequest(requestId: string): Promise<void>
    tryPopRequest(): Promise<void>
    setCurrentRequest(request: HelpRequest): void;
    setRequestStatus(requestId: string, status: ResponderRequestStatuses): Promise<void>
    resetRequestStatus(requestId: string): Promise<void>
    closeRequest(requestId: string): Promise<void>
    reopenRequest(requestId: string): Promise<void>
    updateChatReceipt(request: HelpRequest): Promise<void>
    sendMessage(request: HelpRequest, message: string): Promise<void>
    updateOrAddReq(updatedReq: HelpRequest): void
    
    joinRequest(reqId: string, positionId: string): Promise<void>
    leaveRequest(reqId: string, positionId: string): Promise<void>
    requestToJoinRequest(reqId: string, positionId: string): Promise<void>
    removeUserFromRequest(userId: string, reqId: string, positionId: string): Promise<void>
    getRequestMetadata(userId: string, requestId: string): RequestMetadata
    getPositionScopedMetadata(userId: string, requestId: string, positionId: string): PositionScopedMetadata

    approveRequestToJoinRequest(userId: string, requestId: string, positionId: string): Promise<void>
    denyRequestToJoinRequest(userId: string, requestId: string, positionId: string): Promise<void>
    ackRequestsToJoinNotification(requestId: string): Promise<void>
    joinRequestIsUnseen(userId: string, requestId: string, positionId: string): boolean
    ackRequestNotification(requestId: string): Promise<void>
}

export type CreateShiftData = Pick<Shift, 
    'title' 
    | 'description' 
    | 'positions' 
    | 'recurrence'
>

export interface ITempShiftStore extends CreateShiftData {
    // react to deletions that might affect the locally cached data this store is using
    onRoleDeletedUpdate(roleId: string): void
    clear(prop?: keyof CreateReqData): void
}

export namespace ICreateShiftStore {
    export const id = Symbol('ICreateShiftStore');
}

export interface ICreateShiftStore extends ITempShiftStore {
    createShift: () => Promise<WithoutDates<Shift>>;
    setStartDate: (date?: Date) => Promise<void>;
    startDate: Date;
    defaultShiftDateTime: { startDate: Date, endDate: Date }
}

export namespace IShiftStore {
    export const id = Symbol('IShiftStore');
}

export interface IShiftStore extends IBaseStore {
    shifts: Map<string, Shift>
    shiftsArray: Shift[]
    filteredShiftOccurenceMetadata: ShiftOccurrenceMetadata[]

    filter: ShiftsFilter
    dateRange: DateTimeRange
    initialScrollFinished: boolean
    scrollToDate: Date

    currentShiftOccurrence: ShiftOccurrence
    currentShiftOccurrenceId: string

    setFilter(filter: ShiftsFilter): Promise<void>
    setDaysFilter(daysFilter: CalendarDaysFilter): Promise<void>
    setNeedsPeopleFilter(needsPeopleFilter: ShiftNeedsPeopleFilter): Promise<void>
    setRolesFilter(rolesFilter: ShiftsRolesFilter): Promise<void>
    initializeDateRange(dateRange: DateTimeRange): Promise<void>
    addFutureWeekToDateRange(): Promise<void>
    addPreviousWeekToDateRange(): Promise<void>
    getShifts(shiftIds?: string[]): Promise<void>
    getShift(shiftId: string): Promise<void>
    getShiftOccurrence(shiftOccurrenceId: string): ShiftOccurrence
    getShiftStatus(shiftOccurrence: ShiftOccurrence): ShiftStatus
    updateOrAddShift(updatedShift: WithoutDates<Shift>): void
    setCurrentShiftOccurrence(shift: ShiftOccurrence): void;
}

export type EditOrganizationData = Pick<OrganizationMetadata, 'name' | 'roleDefinitions' | 'attributeCategories' | 'tagCategories'>

export interface ITempOrganizationStore extends EditOrganizationData {
    clear(prop?: keyof EditOrganizationData): void
}

export namespace IOrganizationStore {
    export const id = Symbol('IOrganizationStore');
}

export interface IOrganizationStore extends IBaseStore {
    metadata: OrganizationMetadata
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

export namespace IOrganizationSettingsStore {
    export const id = Symbol('IOrganizationSettingsStore');
}

export interface IOrganizationSettingsStore extends IBaseStore {
    saveName(updatedName: string): Promise<void>
    saveRequestPrefix(updatedPrefix: string): Promise<void>
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
    minimizable: boolean
    submitting: boolean

    drawerShouldShow: boolean
    drawerShowing: boolean
    activeRequestShowing: boolean
    minimizedHandleShowing: boolean

    viewId: BottomDrawerView
    view: BottomDrawerComponentClass

    drawerContentHeight: Animated.AnimatedInterpolation<number>
    contentHeight: Animated.AnimatedInterpolation<number>
    
    contentHeightChange(): Promise<void>
    show(view: BottomDrawerView, expanded?: boolean): void;
    hide(): void// should this take an optional callback?
    expand(): void
    minimize(): void
    startSubmitting(): void
    endSubmitting(): void
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
    createShift = 'cs',
    editShift = 'es'
}

export type BottomDrawerComponentClass = React.ComponentClass & {
    onHide?: () => void,
    onShow?: () => void,
    minimizable?: boolean,
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

    hideKeyboard(): Promise<void>
}

export namespace INativeEventStore {
    export const id = Symbol('INativeEventStore');
}

export interface IHeaderStore extends IBaseStore {
    isOpen: boolean;
    announcementHeight: Animated.Value;
    open(): void;
    close(): void;
}

export namespace IHeaderStore {
    export const id = Symbol('IHeaderStore');
}

export interface IConnectionStore extends IBaseStore {
    isConnected: boolean;
}

export namespace IConnectionStore {
    export const id = Symbol('IConnectionStore');
}

export interface ILinkingStore extends IBaseStore {
    initialRoute: keyof RootStackParamList;
    initialRouteParams: any

    call: (phone: string) => Promise<void>
    mailTo: (phone: string) => Promise<void>
}

export namespace ILinkingStore {
    export const id = Symbol('ILinkingStore');
}

export type EditUserData = Omit<User, 'organizations' | 'id'>

export interface ITempUserStore extends EditUserData, IBaseStore { 
    // react to deletions that might affect the locally cached data this store is using
    onRoleDeletedUpdate(roleId: string): void
}

export namespace INewUserStore {
    export const id = Symbol('INewUserStore');
}

export interface INewUserStore extends ITempUserStore {
    roleIds: string[]
    attributes: CategorizedItem[]

    isValid: boolean
    phoneValid: boolean
    emailValid: boolean
    roleIDsValid: boolean
    
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
    // TODO: Make required?
    testID?: string,
    label: string,
    onPress: () => void
    confirming?: boolean
    dontHide?: boolean
}

export type PromptConfig = {
    title: string,
    message: string | ((textStyling: TextStyle) => JSX.Element), 
    actions: [PromptAction] | [PromptAction, PromptAction]
}

export type ToastConfig = {
    message: string,
    unauthenticated?: boolean, // outlet to allow callers to force the toast to show even if the user isnt signed in
    type: 'success' | 'error'
}

export interface IAlertStore extends IBaseStore {
    toast?: ToastConfig
    prompt?: PromptConfig
    alertTop: Animated.AnimatedInterpolation<number>;
    alertWidth: number;
    alertLeft: number;
    
    toastSuccess(message: string, unauthenticated?: boolean): void;
    toastError(message: string, unauthenticated?: boolean): void;

    showPrompt(config: PromptConfig): void
    hidePrompt(): void
    hideToast(): void
    hideAlerts(): void
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
    pendingRequestUpdate(packet: PatchEventPacket<IndividualRequestEventType>): Promise<void>
    onEvent(packet: PatchEventPacket): Promise<void>

    // NOTE: this method is only called by the store that does the delete or internally when responding to an update
    // then the update store notifies the other affected stores...don't need it for tags/attributes because they are 
    // are purely optional and get filtered out anyway
    onRoleDeleted(roleId: string): void   
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
    pendingItems: Map<string, string>

    isDirty: boolean
    isValid: boolean

    addCategory: (categoryName: string) => void
    editCategory: (categoryId: string, categoryName: string) => void
    removeCategory: (categoryId: string) => void

    addItemToCategory: (categoryId: string, itemName: string) => void
    editItem: (categoryId: string, itemId: string, itemName: string) => void
    removeItemFromCategory: (categoryId: string, itemId: string) => void

    updatePendingItem: (categoryId: string, itemId: string) => void

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
    currentTab: string;

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

export namespace IAppUpdateStore {
    export const id = Symbol('IAppUpdateStore');
}

export interface IAppUpdateStore extends IBaseStore {
    waitingForReload: boolean
}

export namespace IFormStore {
    export const id = Symbol('IFormStore');
}

export interface IFormStore extends IBaseStore {
    inputViewMap: FormInputViewMap
    belowSurface: boolean

    increaseDepth(): void
    decreaseDepth(): void
    clearDepth(): void
}

export namespace IDynamicConfigStore {
    export const id = Symbol('IDynamicConfigStore');
}

export interface IDynamicConfigStore extends IBaseStore, DynamicConfig {
    update(): Promise<void>
}

export const userStore = () => getStore<IUserStore>(IUserStore);
export const locationStore = () => getStore<ILocationStore>(ILocationStore);
export const notificationStore = () => getStore<INotificationStore>(INotificationStore);
export const dispatchStore = () => getStore<IDispatchStore>(IDispatchStore);
export const createRequestStore = () => getStore<ICreateRequestStore>(ICreateRequestStore);
export const editRequestStore = () => getStore<IEditRequestStore>(IEditRequestStore);
export const requestStore = () => getStore<IRequestStore>(IRequestStore);
export const createShiftStore = () => getStore<ICreateShiftStore>(ICreateShiftStore);
export const shiftStore = () => getStore<IShiftStore>(IShiftStore);
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
export const organizationSettingsStore = () => getStore<IOrganizationSettingsStore>(IOrganizationSettingsStore);
export const appUpdateStore = () => getStore<IAppUpdateStore>(IAppUpdateStore);
export const formStore = () => getStore<IFormStore>(IFormStore);
export const connectionStore = () => getStore<IConnectionStore>(IConnectionStore);
export const dynamicConfigStore = () => getStore<IDynamicConfigStore>(IDynamicConfigStore);

export const AllStores = [
    IUserStore,
    ILocationStore,
    INotificationStore,
    IDispatchStore,
    ICreateRequestStore,
    IRequestStore,
    IShiftStore,
    ICreateShiftStore,
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
    IUpsertRoleStore,
    IManageAttributesStore,
    IManageTagsStore,
    INavigationStore,
    IOrganizationSettingsStore,
    IAppUpdateStore,
    IFormStore,
    IConnectionStore,
    IDynamicConfigStore
]
