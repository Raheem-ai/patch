import { AtLeast } from '.';
import { allEnumValues } from './utils';
import { positionStats } from './utils/requestUtils';

export interface AuthTokens {
    refreshToken: string,
    accessToken: string
}

export interface User {
    id: string;
    name: string;
    email: string;
    phone: string;
    password: string;
    organizations: { [key: string]: UserOrgConfig }
    displayColor: string
    skills: RequestSkill[]
    race?: string
    pronouns?: string
    bio?: string
    // location?
}

export type EditableUser = Pick<ProtectedUser, 'organizations' | 'skills' >
export type EditableMe = Omit<Me, 'organizations' | 'skills'>
export type AdminEditableUser = Pick<UserOrgConfig, 'roleIds' | 'attributes'>

export type UserOrgConfig = {
    roles: UserRole[],
    roleIds: string[],
    attributes: CategorizedItem[],
    onDuty: boolean
}

export type SystemProperties = 'password';
export type PrivateProperties = 'race'

export type MinUser = AtLeast<User, 'email' | SystemProperties | 'name'>

export type ProtectedUser = Omit<User, PrivateProperties | SystemProperties>;

// this will change from being the same as ProtectedUser when we get
// more profile fields
export type Me = Omit<User, SystemProperties>

export type BasicCredentials = {
    email: string, 
    password: string
}

// Organizations
export interface Organization {
    name: string;
    id: string;
    members: ProtectedUser[];
    lastRequestId: number;
    lastDayTimestamp: string;
    pendingUsers: PendingUser[]
    removedMembers: ProtectedUser[]
    roleDefinitions: Role[]
    attributeCategories: AttributeCategory[] 
    tagCategories: TagCategory[]
}

export type OrganizationMetadata = Pick<Organization, 'id' | 'name' | 'roleDefinitions' | 'attributeCategories' | 'tagCategories'>;
export type MinOrg = AtLeast<Organization, 'name'>;

export type Role = {
    id: string,
    name: string,
    permissionGroups: PatchPermissionGroups[]
}

export type MinRole = AtLeast<Role, 'name' | 'permissionGroups'>

export type AttributeCategory = {
    id: string,
    name: string,
    attributes: Attribute[]
}

export type MinAttributeCategory = AtLeast<AttributeCategory, 'name'>
export type AttributeCategoryUpdates = AtLeast<Omit<AttributeCategory, 'attributes'>, 'id'>

export type Attribute = {
    id: string,
    name: string
}

export type MinAttribute = AtLeast<Attribute, 'name'>

export type Category = { 
    name: string, 
    items: {
        id: string,
        name: string 
    }[]
}

export type CategorizedItem = {
    categoryId: string,
    itemId: string
}

export type CategorizedItemUpdates = {
    categoryNameChanges: { id: string, name: string }[];
    itemNameChanges: { categoryId: string, itemId: string, name: string }[];

    deletedCategories: string[];
    deletedItems: { [categoryId: string]: string[] };

    newCategories: { [id: string]: Category }
    
    newItems: { 
        [categoryId: string]: string[]
    }
}

export type TagCategory = {
    id: string,
    name: string,
    tags: Tag[]
}

export type MinTagCategory = AtLeast<TagCategory, 'name'>
export type TagCategoryUpdates = AtLeast<Omit<TagCategory, 'tags'>, 'id'>

export type Tag = {
    id: string,
    name: string
}

// export type TagsMap = { [key: string]: string[] }
export type AttributesMap = { [key: string]: string[] }

export type MinTag = AtLeast<Tag, 'name'>

export type PendingUser = {
    email: string
    phone: string
    roles: UserRole[]
    roleIds: string[]
    attributes: CategorizedItem[]
    skills: RequestSkill[]
    pendingId: string
}

export enum UserRole {
    Admin,
    Dispatcher,
    Responder
}

export const UserRoleToLabelMap: { [key in UserRole]: string } = {
    [UserRole.Admin]: 'Admin',
    [UserRole.Dispatcher]: 'Dispatcher',
    [UserRole.Responder]: 'Responder'
}

export const UserRoleToInfoLabelMap: { [key in UserRole]: string } = {
    [UserRole.Admin]: 'Admin: Manage org team members',
    [UserRole.Dispatcher]: 'Dispatcher: Manage requests and their responders',
    [UserRole.Responder]: 'Responder: Respond to requests'
}

export type AddressableLocation = {
    latitude: number,
    longitude: number,
    address: string
}

export type HelpRequestAssignment = {
    timestamp: number,
    responderIds: string[]
}

export type HelpRequest = {
    id: string
    displayId: string
    orgId: string
    location: AddressableLocation
    type: RequestType[]
    // TODO: change to descriptiom
    notes: string
    // skills: RequestSkill[]
    // tags: TagsMap
    // otherRequirements?: any //TODO: nix these until later on
    // respondersNeeded: number
    chat: Chat
    dispatcherId: string
    status: RequestStatus
    createdAt: string
    updatedAt: string

    assignments: HelpRequestAssignment[]
    assignedResponderIds: string[]
    declinedResponderIds: string[]
    // removedResponderIds: string[]

    callerName: string,
    callerContactInfo: string,
    callStartedAt: string,
    callEndedAt: string,
    priority: RequestPriority,
    tagHandles: CategorizedItem[],
    positions: Position[]
    /**
     * 
     * Optioon 1: array of these events that we use mobx computed caching to project into a map of what people should be in what sections in the ui
     * 
     * Events for
     * - sent
     *  - by: string 
     *  - to: string[]
     *  - sentAt: string
     * - seen
     *  - by: string
     *  - seenAt: string
     * - joined
     *  - user: string
     *  - position: string
     *  - joinedAt: string
     * - requested to join
     *  - id: string
     *  - requester: string
     *  - position: string
     *  - requestedAt: string
     * - request denied
     *  - requestId: string
     *  - by: string
     *  - deniedAt: string
     * - request accepted
     *  - requestId: string
     *  - by: string
     *  - acceptedAt: string
     * - left
     *  - user: string
     *  - position: string
     *  - leftAt: string
     * - kicked
     *  - user: string
     *  - by: string
     *  - kickedAt: string 
     * 
     * option 2:
     * have those events only on the object the db sees but never sent to the frontend...the backend computes the new frontend model 
     * pros: ui doesn't have data about other users activity details
     * cons: slower api calls doing cpu bound checks
     * 
     * recommendation do it in ui and can port that to backend if need be
     */
    teamEvents: RequestTeamEvent[]

    statusEvents: RequestStatusEvent[]
}

export type RequestStatusEvent = {
    status: RequestStatus,
    setBy: string,
    setAt: string
}

export enum RequestTeamEventTypes {
    NotificationSent = 'nsen',
    NotificationSeen = 'nsee',
    PositionJoined = 'pojo',
    PositionRequested = 'porq',
    PositionRequestSeen = 'prs',
    PositionLeft = 'pole',
    PositionRevoked = 'porv',
    PositionRequestAccepted = 'pra',
    PositionRequestDenied = 'prd'
}

export type RequestTeamEventParams = {
    [RequestTeamEventTypes.NotificationSent]: {
        by: string
        to: string[]
        sentAt: string
    },
    [RequestTeamEventTypes.NotificationSeen]: {
        by: string,
        seenAt: string
    },
    [RequestTeamEventTypes.PositionRequestSeen]: {
        by: string,
        seenAt: string,
        position: string,
        requester: string
    },
    [RequestTeamEventTypes.PositionJoined]: {
        user: string
        position: string
        joinedAt: string
    },
    [RequestTeamEventTypes.PositionRequested]: {
        requester: string
        position: string
        requestedAt: string
    },
    [RequestTeamEventTypes.PositionRequestAccepted]: {
        requester: string
        position: string
        by: string
        acceptedAt: string
    },
    [RequestTeamEventTypes.PositionRequestDenied]: {
        requester: string
        position: string
        by: string
        deniedAt: string
    },
    [RequestTeamEventTypes.PositionLeft]: {
        user: string
        position: string
        leftAt: string
    },
    [RequestTeamEventTypes.PositionRevoked]: {
        user: string
        by: string
        revokedAt: string, 
        position: string 
    }
};

export type RequestTeamEvent<Type extends RequestTeamEventTypes = RequestTeamEventTypes> = {
    type: Type
} & RequestTeamEventParams[Type];

export type Position = {
    id: string,
    attributes: CategorizedItem[],
    role: string,
    min: number,
    max: number,
    joinedUsers: string[]
}

export enum PositionStatus {
    MinSatisfied,
    MinUnSatisfied,
    Empty
}

export enum RequestPriority {
    Low,
    Medium,
    High
}

export enum HelpRequestFilter {
    Active = 'ac',
    Finished = 'fi',
    All = 'al'
};

export enum HelpRequestSortBy {
    ByTime = 'bt',
    ByStatus = 'bs'
    // BySeverity = 'bs',
    // ByDistance = 'bd'
};

export type MinHelpRequest = AtLeast<HelpRequest, 'type'>

export enum TeamFilter {
    Everyone = 'ev',
    OnDuty = 'on',
    OffDuty = 'off'
};

export enum TeamSortBy {
    ByLastName = 'bln',
    ByFirstName = 'bfn',
    BySkill = 'bs'
};

export type Chat = {
    id: string,
    messages: ChatMessage[],
    lastMessageId: number,
    userReceipts: { [userId: string]: number }
}

export type ChatMessage = {
    id: number,
    userId: string,
    message: string,
    timestamp: number
}

// Note: this being a number enum
export enum RequestStatus {
    // automatically updated
    Unassigned,
    PartiallyAssigned,
    Ready,
    // updated by any responder
    // TODO: should you be able to skip to ontheway before all responders are ready?
    OnTheWay,
    OnSite,
    Done
}

export const RequestStatusToLabelMap: { [key in RequestStatus]: string | ((req: HelpRequest) => string) } = {
    [RequestStatus.Unassigned]: 'Unassigned',
    [RequestStatus.PartiallyAssigned]: (req: HelpRequest) => {
        const stats = positionStats(req.positions);
        return `${stats.totalMinFilled} of ${stats.totalMinToFill}`
    },
    [RequestStatus.Ready]: 'Ready',
    [RequestStatus.OnTheWay]: 'On the way',
    [RequestStatus.OnSite]: 'On site',
    [RequestStatus.Done]: 'Finished',
}

export type ResponderRequestStatuses = 
    RequestStatus.OnTheWay
    | RequestStatus.OnSite
    | RequestStatus.Done;

export enum RequestSkillCategory {
    Medical = 'me',
    CounselingAndMediation = 'cm',
    Languages = 'la'
}

export enum RequestSkill {
    // medical
    CPR = RequestSkillCategory.Medical + ':cp',
    FirstAid = RequestSkillCategory.Medical + ':fa',
    MentalHealth = RequestSkillCategory.Medical + ':mh',
    SubstanceUseTreatment = RequestSkillCategory.Medical + ':su',

    // counseling + mediation
    ConflictResolution = RequestSkillCategory.CounselingAndMediation + ':cr',
    DomesticViolence = RequestSkillCategory.CounselingAndMediation + ':dv',
    RestorativeJustice = RequestSkillCategory.CounselingAndMediation + ':rj',
    TraumaCounseling = RequestSkillCategory.CounselingAndMediation + ':tc',
    
    // langs
    // ISO 639-3 Language Codes: https://iso639-3.sil.org/code_tables/639/data
    Amharic = RequestSkillCategory.Languages + ':amh',
    Arabic = RequestSkillCategory.Languages + ':ara',
    Bengali = RequestSkillCategory.Languages + ':ben',
    Cantonese = RequestSkillCategory.Languages + ':yue',
    French = RequestSkillCategory.Languages + ':fra',
    Hindi = RequestSkillCategory.Languages + ':hin',
    Mandarin = RequestSkillCategory.Languages + ':cmn',
    Portuguese = RequestSkillCategory.Languages + ':por',
    Spanish = RequestSkillCategory.Languages + ':spa',
    Tagalog = RequestSkillCategory.Languages + ':tgl',
    Vietnamese = RequestSkillCategory.Languages + ':vie'
}

export function requestSkillToCategory(skill: RequestSkill): RequestSkillCategory {
    const cat = (skill as any as string).split(':')[0];
    return cat as RequestSkillCategory
}

export function requestSkillsFromCategory(cat: RequestSkillCategory): RequestSkill[] {
    const skills = allEnumValues(RequestSkill);

    return skills.filter((skill: string) => {
        return skill.split(':')[0] == cat
    });
}

export const RequestSkillCategoryMap: {
    [key in RequestSkillCategory]: Set<RequestSkill>
} = allEnumValues(RequestSkillCategory).reduce((map, cat) => {
    map[cat] = new Set(requestSkillsFromCategory(cat));
    return map;
}, {})

export const RequestSkillToLabelMap: { [key in RequestSkill]: string } = {
    [RequestSkill.CPR]: 'CPR',
    [RequestSkill.FirstAid]: 'First Aid',
    [RequestSkill.MentalHealth]: 'Mental Health',
    [RequestSkill.SubstanceUseTreatment]: 'Substance Use Treatment',
    [RequestSkill.ConflictResolution]: 'Conflict Resolution',
    [RequestSkill.DomesticViolence]: 'Domestic Violence',
    [RequestSkill.RestorativeJustice]: 'Restorative Justice',
    [RequestSkill.TraumaCounseling]: 'Trauma Counseling',
    [RequestSkill.Amharic]: 'Amharic',
    [RequestSkill.Arabic]: 'Arabic',
    [RequestSkill.Bengali]: 'Bengali',
    [RequestSkill.Cantonese]: 'Cantonese',
    [RequestSkill.French]: 'French',
    [RequestSkill.Hindi]: 'Hindi',
    [RequestSkill.Mandarin]: 'Mandarin',
    [RequestSkill.Portuguese]: 'Portuguese',
    [RequestSkill.Spanish]: 'Spanish',
    [RequestSkill.Tagalog]: 'Tagalog',
    [RequestSkill.Vietnamese]: 'Vietnamese'
}

export const RequestSkillCategoryToLabelMap: { [key in RequestSkillCategory]: string } = {
    [RequestSkillCategory.Medical]: 'Medical',
    [RequestSkillCategory.CounselingAndMediation]: 'Counseling & Mediation',
    [RequestSkillCategory.Languages]: 'Languages',
}

export enum RequestType {
    ConflictResolution = 'cr',
    CopWatching = 'cw',
    Counseling = 'co',
    DomesticDisturbance = 'dd',
    FirstAid = 'fa',
    Housing = 'ho',
    MentalHealthCrisis = 'mh',
    ProvidingSupplies = 'ps',
    ResourceReferral = 'rr',
    SubstanceCounseling = 'sc',
    Transportation = 'tr',
    WellnessCheck = 'wc'
}

export const RequestTypeToLabelMap: { [key in RequestType]: string } = {
    [RequestType.ConflictResolution]: 'Conflict Resolution',
    [RequestType.CopWatching]: 'Cop Watching',
    [RequestType.Counseling]: 'Counseling',
    [RequestType.DomesticDisturbance]: 'Domestic Disturbance',
    [RequestType.FirstAid]: 'First Aid',
    [RequestType.Housing]: 'Housing',
    [RequestType.MentalHealthCrisis]: 'Mental Health Crisis',
    [RequestType.ProvidingSupplies]: 'Providing Supplies',
    [RequestType.ResourceReferral]: 'Resource Referral',
    [RequestType.SubstanceCounseling]: 'Substance Counseling',
    [RequestType.Transportation]: 'Transportation',
    [RequestType.WellnessCheck]: 'Wellness Check'
}

export type Location = {
    coords: {
        latitude: number;
        longitude: number;
        altitude: number | null;
        accuracy: number | null;
        altitudeAccuracy: number | null;
        heading: number | null;
        speed: number | null;
    };
    timestamp: number;
};

export enum NotificationType {
    AssignedIncident = 'ai',
    BroadCastedIncident = 'bi',
    UIUpdate = 'uiu'
}

export type NotificationPayloads = {
    [NotificationType.AssignedIncident] : {
        id: string,
        orgId: string
    },
    [NotificationType.BroadCastedIncident]: {
        id: string,
        orgId: string
    },
    [NotificationType.UIUpdate]: {
        uiEvent: PatchUIEventPacket
    }
}

export type NotificationPayload<T extends NotificationType> = NotificationPayloads[T];

export type AppSecrets = {
    googleMapsApiKey: string
}

export enum LinkExperience {
    SignUpThroughOrganization = 'suto',
    JoinOrganization = 'jo'
}

export type LinkParams = {
    [LinkExperience.SignUpThroughOrganization]: {
        orgId: string,
        email: string,
        roles: UserRole[],
        skills: RequestSkill[],
        pendingId: string
    },
    [LinkExperience.JoinOrganization]: {
        orgId: string,
        email: string,
        roles: UserRole[],
        pendingId: string
    } 
} 

export enum PatchEventType {
    // User.System.<_>
    UserForceLogout = '0.0.0',
    UserCreated = '0.0.1',
    UserEdited = '0.0.2',
    UserDeleted = '0.0.3',

    // User.Org.<_>
    UserAddedToOrg = '0.1.0',
    UserRemovedFromOrg = '0.1.1',
    UserChangedRolesInOrg = '0.1.2',

    // User.Duty.<_>
    UserOnDuty = '0.2.0',
    UserOffDuty = '0.2.1',

    // Request.System.<_>
    RequestCreated = '1.0.0',
    RequestEdited =	'1.0.1',
    RequestDeleted = '1.0.2',

    // Request.Responders.<_>
    RequestRespondersAssigned =	'1.1.0',
    RequestRespondersAccepted =	'1.1.1',
    RequestRespondersJoined =	'1.1.2',
    RequestRespondersDeclined =	'1.1.3',
    RequestRespondersLeft =	'1.1.4',
    RequestRespondersRemoved =	'1.1.5',

    // Request.Chat.<_>
    RequestChatNewMessage =	'1.2.0',

    // Organization.System.<_>
    OrganizationEdited = '2.0.0',
    OrganizationDeleted = '2.0.1',

    // Organization.Roles.<_>
    OrganizationRoleCreated = '2.1.0',
    OrganizationRoleEdited = '2.1.1',
    OrganizationRoleDeleted = '2.1.2',

    // Organization.Attributes.<_>
    OrganizationAttributesUpdated = '2.2.0',
    // TODO: not sure these make sense anymore now that we have a single update command
    OrganizationAttributeCreated = '2.2.1',
    OrganizationAttributeEdited = '2.2.2',
    OrganizationAttributeDeleted = '2.2.3',
    OrganizationAttributeCategoryCreated = '2.2.4',
    OrganizationAttributeCategoryEdited = '2.2.5',
    OrganizationAttributeCategoryDeleted = '2.2.6',

    // Organization.Tags.<_>
    OrganizationTagsUpdated = '2.3.0',
    // TODO: not sure these make sense anymore now that we have a single update command
    OrganizationTagCreated = '2.3.1',
    OrganizationTagEdited = '2.3.2',
    OrganizationTagDeleted = '2.3.3',
    OrganizationTagCategoryCreated = '2.3.4',
    OrganizationTagCategoryEdited = '2.3.5',
    OrganizationTagCategoryDeleted = '2.3.6',
}

export type PatchEventParams = {
    [PatchEventType.UserForceLogout]: {
        userId: string
    },
    [PatchEventType.UserCreated]: {}
    [PatchEventType.UserEdited]: {
        userId: string
    },
    [PatchEventType.UserDeleted]: {
        userId: string
    }, 
    [PatchEventType.UserAddedToOrg]: {
        userId: string,
        orgId: string
    }, 
    [PatchEventType.UserRemovedFromOrg]: {
        userId: string,
        orgId: string
    }, 
    [PatchEventType.UserChangedRolesInOrg]: {
        userId: string,
        orgId: string
    }, 
    [PatchEventType.UserOnDuty]: {
        userId: string
    }, 
    [PatchEventType.UserOffDuty]: {
        userId: string
    }, 
    [PatchEventType.RequestCreated]: {
        requestId: string
    }, 
    [PatchEventType.RequestEdited]: {
        requestId: string
    }, 
    [PatchEventType.RequestDeleted]: {
        requestId: string
    }, 
    [PatchEventType.RequestRespondersAssigned]: {
        requestId: string
    }, 
    [PatchEventType.RequestRespondersAccepted]: {
        responderId: string,
        requestId: string,
        positionId: string
    }, 
    [PatchEventType.RequestRespondersJoined]: {
        responderId: string,
        requestId: string,
        positionId: string
    }, 
    [PatchEventType.RequestRespondersDeclined]: {
        responderId: string,
        requestId: string,
        positionId: string
    }, 
    [PatchEventType.RequestRespondersLeft]: {
        responderId: string,
        requestId: string,
        positionId: string
    }, 
    [PatchEventType.RequestRespondersRemoved]: {
        responderId: string,
        requestId: string,
        positionId: string
    }, 
    [PatchEventType.RequestChatNewMessage]: {
        requestId: string,
        userId: string
    },
    [PatchEventType.OrganizationEdited]: {
        orgId: string
    },
    [PatchEventType.OrganizationDeleted]: {
        orgId: string
    },
    [PatchEventType.OrganizationRoleCreated]: {
        orgId: string,
        roleId: string
    },
    [PatchEventType.OrganizationRoleEdited]: {
        orgId: string,
        roleId: string
    },
    [PatchEventType.OrganizationRoleDeleted]: {
        orgId: string,
        roleId: string
    },
    [PatchEventType.OrganizationAttributeCreated]: {
        orgId: string,
        categoryId: string,
        attributeId: string
    },
    [PatchEventType.OrganizationAttributeEdited]: {
        orgId: string,
        categoryId: string,
        attributeId: string
    },
    [PatchEventType.OrganizationAttributeDeleted]: {
        orgId: string,
        categoryId: string,
        attributeId: string
    },
    [PatchEventType.OrganizationAttributeCategoryCreated]: {
        orgId: string,
        categoryId: string
    },
    [PatchEventType.OrganizationAttributeCategoryEdited]: {
        orgId: string,
        categoryId: string
    },
    [PatchEventType.OrganizationAttributeCategoryDeleted]: {
        orgId: string,
        categoryId: string
    },
    [PatchEventType.OrganizationTagCreated]: {
        orgId: string,
        categoryId: string,
        tagId: string
    },
    [PatchEventType.OrganizationTagEdited]: {
        orgId: string,
        categoryId: string,
        tagId: string
    },
    [PatchEventType.OrganizationTagDeleted]: {
        orgId: string,
        categoryId: string,
        tagId: string
    },
    [PatchEventType.OrganizationTagCategoryCreated]: {
        orgId: string,
        categoryId: string
    },
    [PatchEventType.OrganizationTagCategoryEdited]: {
        orgId: string,
        categoryId: string
    },
    [PatchEventType.OrganizationTagCategoryDeleted]: {
        orgId: string,
        categoryId: string
    },
    // could add the CategorizedItemUpdates tyoe here if we want more granular logging/updating around 
    // the updates
    [PatchEventType.OrganizationAttributesUpdated]: {
        orgId: string
    },
    [PatchEventType.OrganizationTagsUpdated]: {
        orgId: string
    },
}

export type PatchEventPacket<T extends PatchEventType = any> = {
    event: T,
    params: PatchEventParams[T]
}

export enum PatchUIEvent {
    ForceLogout = 'fl',
    UpdateResource = 'ur'
}

export type PatchUIEventParams = {
    [PatchUIEvent.ForceLogout]: {
        refreshToken: string
    },
    [PatchUIEvent.UpdateResource]: {
        orgId?: string
        requestId?: string
        userId?: string
        roleId?: string
        attributeCategoryId?: string
        attributeId?: string
        tagCategoryId?: string
        tagId?: string
        userList?: boolean
        requestList?: boolean
    },
}

export type PatchUIEventPacket<UIEvent extends PatchUIEvent = any, SysEvent extends PatchEventType = any> = {
    event: UIEvent
    params: PatchUIEventParams[UIEvent]
    sysEvent: SysEvent
    sysParams: PatchEventParams[SysEvent]
}

export type DateTimeRange = {
    startDate: Date
    endDate: Date
}

export enum RecurringPeriod {
    Day = 'd',
    Week = 'w',
    Month = 'm',
}

export type RecurringTimePeriod = ({
    period: RecurringPeriod.Month,
    dayScope?: boolean,
    weekScope?: boolean
} | {
    period: RecurringPeriod.Week,
    days: number[]
} | {
    period: RecurringPeriod.Day
}) & { numberOf: number }

export type RecurringTimeConstraints = {
    every?: RecurringTimePeriod
    until?: {
        date: Date,
        repititions: null
    } | {
        date: null,
        repititions: number
    }
}

export type RecurringDateTimeRange = RecurringTimeConstraints & DateTimeRange;
export enum PatchPermissions {
    // Edit organization settings
    EditOrgSettings = 'eos',
    // Create, edit, and delete org Roles
    RoleAdmin = 'ra',
    // Create, edit, and delete org Attributes
    AttributeAdmin = 'attra',
    // Create, edit, and delete org Tags
    TagAdmin = 'ta',
    // Export org data
    ExportData = 'ed',
    // Invite people to org
    InviteToOrg = 'ito',
    // Remove people from org
    RemoveFromOrg = 'rfo',
    // Assign Roles to people in org
    AssignRoles = 'ar',
    // Assign Attributes to people in org
    AssignAttributes = 'aattr',
    // Create and manage chats
    ChatAdmin = 'ca',
    // Invite people to chats (user can see)
    InviteToChat = 'itc',
    // See all chats in org (incl. all request/shift chats)
    SeeAllChats = 'sac',
    // See all Shift chats
    SeeShiftChats = 'ssc',
    // See all Request chats
    SeeRequestChats = 'src',
    // Create and manage shifts,
    ShiftAdmin = 'sa',
    // Create and manage all requests
    RequestAdmin = 'reqa',
    // Edit data for requests (user is on)
    EditRequestData = 'erd',
    // Close requests (user is on)
    CloseRequests = 'cr'
}

export enum PatchPermissionGroups {
    ManageOrg = 'mo',
    EditRoles = 'er',
    ManageMetadata = 'mm',
    ExportData = 'ed',
    ManageTeam = 'mt',
    ManageChats = 'mc',
    InviteToChats = 'itc',
    SeeAllChats = 'sac',
    ManageSchedule = 'ms',
    ManageRequests = 'mr',
    ContributeToRequests = 'ctr',
    CloseRequests = 'cr'
}

export type PatchPermissionGroupMetadata = {
    name: string,
    description: string,
    permissions: PatchPermissions[],
    forces?: PatchPermissionGroups[]
}

export const PermissionGroupMetadata: { [key in PatchPermissionGroups]: PatchPermissionGroupMetadata } = {
    [PatchPermissionGroups.ManageOrg]: {
        name: 'Manage organization',
        description: 'Change name and other org-wide settings',
        permissions: [
            PatchPermissions.EditOrgSettings
        ]
    },
    [PatchPermissionGroups.EditRoles]: {
        name: 'Edit roles',
        description: 'Define roles and set permissions',
        permissions: [
            PatchPermissions.RoleAdmin
        ]
    },
    [PatchPermissionGroups.ManageMetadata]: {
        name: 'Manage metadata',
        description: 'Define attributes for people and tags for requests',
        permissions: [
            PatchPermissions.AttributeAdmin,
            PatchPermissions.TagAdmin
        ]
    },
    [PatchPermissionGroups.ExportData]: {
        name: 'Export data',
        description: 'Save locations, timing, and other info',
        permissions: [
            PatchPermissions.ExportData
        ]
    },
    [PatchPermissionGroups.ManageTeam]: {
        name: 'Manage team',
        description: 'Invite people and assign roles and attributes',
        permissions: [
            PatchPermissions.InviteToOrg,
            PatchPermissions.RemoveFromOrg,
            PatchPermissions.AssignRoles,
            PatchPermissions.AssignAttributes,
        ]
    },
    [PatchPermissionGroups.ManageChats]: {
        name: 'Manage chats',
        description: 'Create chat groups and invite people',
        permissions: [
            PatchPermissions.ChatAdmin
        ],
        forces: [PatchPermissionGroups.InviteToChats]
    },
    [PatchPermissionGroups.InviteToChats]: {
        name: 'Invite to chats',
        description: `Add people to any chats you're in`,
        permissions: [
            PatchPermissions.InviteToChat
        ]
    },
    [PatchPermissionGroups.SeeAllChats]: {
        name: 'See all chats',
        description: `View and post without being a member`,
        permissions: [
            PatchPermissions.SeeAllChats,
            PatchPermissions.SeeRequestChats, 
            PatchPermissions.SeeShiftChats
        ]
    },
    [PatchPermissionGroups.ManageSchedule]: {
        name: 'Manage schedule',
        description: `Create, edit, and remove shifts`,
        permissions: [
            PatchPermissions.ShiftAdmin,
            PatchPermissions.SeeShiftChats
        ]
    },
    [PatchPermissionGroups.ManageRequests]: {
        name: 'Manage requests',
        description: `Create requests and notify team`,
        permissions: [
            PatchPermissions.RequestAdmin,
            PatchPermissions.SeeRequestChats
        ],
        forces: [PatchPermissionGroups.ContributeToRequests, PatchPermissionGroups.CloseRequests]
    },
    [PatchPermissionGroups.ContributeToRequests]: {
        name: 'Contribute to requests',
        description: `Edit data and set status when on a request`,
        permissions: [
            PatchPermissions.EditRequestData
        ]
    },
    [PatchPermissionGroups.CloseRequests]: {
        name: 'Close requests',
        description: `When on a request, archive it.`,
        permissions: [
            PatchPermissions.CloseRequests
        ]
    }
}

export function resolvePermissionsFromPermissionGroups(groups: PatchPermissionGroups[], userPermissions?: Set<PatchPermissions>) {
    const setOfPermissions = userPermissions || new Set();
    
    for (const group of groups) {
        (PermissionGroupMetadata[group]?.permissions || []).forEach(permission => {
            setOfPermissions.add(permission);
        });

        resolvePermissionsFromPermissionGroups(PermissionGroupMetadata[group]?.forces || [], setOfPermissions)
    }
}

export function resolvePermissionsFromRoles(roles: Role[]): Set<PatchPermissions> {
    const userPermissions = new Set<PatchPermissions>();

    for (const role of roles) {
        resolvePermissionsFromPermissionGroups(role.permissionGroups, userPermissions)
    }

    return userPermissions;
}

export function resolvePermissionGroups(selectedGroups: PatchPermissionGroups[], visuallySelectedGroups?: Set<PatchPermissionGroups>) {
    const setOfGroups = visuallySelectedGroups || new Set();
    
    for (const group of selectedGroups) {
        setOfGroups.add(group);
        resolvePermissionGroups(PermissionGroupMetadata[group]?.forces || [], setOfGroups)
    }

    return setOfGroups
}

export enum DefaultRoleIds {
    Anyone = '__anyone',
    Admin = '__admin',
    Dispatcher = '__dispatcher',
    Responder = '__responder',
}

export const DefaultRoles: Role[] = [
    {
        id: DefaultRoleIds.Anyone,
        name: 'Anyone',
        permissionGroups: [
            PatchPermissionGroups.InviteToChats
        ]
    },
    {
        id: DefaultRoleIds.Admin,
        name: 'Admin',
        permissionGroups: [
            PatchPermissionGroups.ManageOrg,
            PatchPermissionGroups.ManageChats,
            PatchPermissionGroups.ManageMetadata,
            PatchPermissionGroups.ManageRequests,
            PatchPermissionGroups.ManageSchedule,
            PatchPermissionGroups.ManageTeam,
            PatchPermissionGroups.SeeAllChats,
            PatchPermissionGroups.ExportData,
            PatchPermissionGroups.EditRoles
        ]
    },
    {
        id: DefaultRoleIds.Dispatcher,
        name: 'Dispatcher',
        permissionGroups: [
            PatchPermissionGroups.ManageRequests
        ]
    },
    {
        id: DefaultRoleIds.Responder,
        name: 'Responder',
        permissionGroups: [
            PatchPermissionGroups.ContributeToRequests
        ]
    }
]











