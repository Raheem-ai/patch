import { AtLeast } from '.';
import { allEnumValues } from './utils';
import { positionStats } from './utils/requestUtils';

export type AnyFunction = (...args: any[]) => any;

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
    chat?: Chat
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

export type RequestTeamEventParams = {
    [PatchEventType.RequestRespondersNotified]: {
        by: string
        to: string[]
        sentAt: string
    },
    [PatchEventType.RequestRespondersNotificationAck]: {
        by: string,
        seenAt: string
    },
    [PatchEventType.RequestRespondersRequestToJoinAck]: {
        by: string,
        seenAt: string,
        position: string,
        requester: string
    },
    [PatchEventType.RequestRespondersJoined]: {
        user: string
        position: string
        joinedAt: string
    },
    [PatchEventType.RequestRespondersRequestToJoin]: {
        requester: string
        position: string
        requestedAt: string
    },
    [PatchEventType.RequestRespondersAccepted]: {
        requester: string
        position: string
        by: string
        acceptedAt: string
    },
    [PatchEventType.RequestRespondersDeclined]: {
        requester: string
        position: string
        by: string
        deniedAt: string
    },
    [PatchEventType.RequestRespondersLeft]: {
        user: string
        position: string
        leftAt: string
    },
    [PatchEventType.RequestRespondersRemoved]: {
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

/**
 * TODO: 
 * 1) make these the ONLY event list
 * 2) remove PatchUIEvent all together and make ui do logic for how it should
 * handle updating data and/or showing notifications
 *     a) update store
 * 3) backend only handles the different update/notification heuristics  
 *     a) as a "Best try" over the websocket (user only see's if they are in app)
 *     b) as a notification so it will be picked up in the background
 *     c) can we try socket and tell if it fails/succeeds from an ack from the front end to fall back to notifications?
 * 4) UI unifies how it handles events from notifications vs the websocket and decides what warrants
 * a visual (system) notification vs handling in app ui (even if it comes through a notification!)
 * 5) delete dead code around old properties types on
 *     a) the user model
 *     b) the request model
 *     c) notification types
 *     d) old concepts ie. roles.v1/skills/etc
 */
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
    RequestCreated = '1.0.0', // to users notified
    RequestEdited =	'1.0.1',
    RequestDeleted = '1.0.2',


    // TODO: what do we do about team events on request?!?!
    // 1) roll TeamEventType into these and have TeamEventType just be 
    // a subset of this type
    // 2) have different bindings from PatchEventType variants to the params it needs for
    // - PatchEvent (used in background and sent to user)
    // - RequestTeamEvent (used on request model)

    // Request.Responders.<_>
    // RequestRespondersAssigned =	'1.1.0',

    /**
     * SENT TO: request admins 
     * SENT VIA WEBSOCKET: yes
     * SENT VIA NOTIFICATION: yes
     * SHOULD SHOW NOTIFICATION: no
     */
    RequestRespondersNotified = '1.1.0',

    /**
     * SENT TO: request admins 
     * SENT VIA WEBSOCKET: yes
     * SENT VIA NOTIFICATION: yes
     * SHOULD SHOW NOTIFICATION: no
     */
     RequestRespondersNotificationAck = '1.1.1',

    /**
     * SENT TO: request admins 
     * SENT VIA WEBSOCKET: yes
     * SENT VIA NOTIFICATION: yes
     * SHOULD SHOW NOTIFICATION: yes
     */
     RequestRespondersRequestToJoin = '1.1.2',  
     /**
     * SENT TO: nobody currently
     * SENT VIA WEBSOCKET: n/a
     * SENT VIA NOTIFICATION: n/a
     * SHOULD SHOW NOTIFICATION: n/a
     */
      RequestRespondersRequestToJoinAck = '1.1.3',  
    /**
     * SENT TO: requester...NOTE: already joined users get same as joined notification 
     * SENT VIA WEBSOCKET: yes
     * SENT VIA NOTIFICATION: yes
     * SHOULD SHOW NOTIFICATION: yes
     */
     RequestRespondersAccepted =	'1.1.4',  
    /**
     * SENT TO: already joined users + request admins 
     * SENT VIA WEBSOCKET: yes
     * SENT VIA NOTIFICATION: yes
     * SHOULD SHOW NOTIFICATION: yes
     */
     RequestRespondersJoined =	'1.1.5',  
    /**
     * SENT TO: requester 
     * SENT VIA WEBSOCKET: yes
     * SENT VIA NOTIFICATION: yes
     * SHOULD SHOW NOTIFICATION: yes
     */
     RequestRespondersDeclined =	'1.1.6',  
    /**
     * SENT TO: already joined users + request admins 
     * SENT VIA WEBSOCKET: yes 
     * SENT VIA NOTIFICATION: yes
     */
     RequestRespondersLeft =	'1.1.7',      
    /**
     * SENT TO: the kicked user...NOTE: already joined users get same as left notification 
     * SENT VIA WEBSOCKET: yes
     * SENT VIA NOTIFICATION: yes
     * SHOULD SHOW NOTIFICATION: yes
     */
     RequestRespondersRemoved =	'1.1.8',  

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

    // Organization.Tags.<_>
    OrganizationTagsUpdated = '2.3.0',
}

// PatchEventType Convenience Type
export type RequestTeamEventTypes =
    PatchEventType.RequestRespondersNotified
    | PatchEventType.RequestRespondersNotificationAck
    | PatchEventType.RequestRespondersJoined
    | PatchEventType.RequestRespondersRequestToJoin
    | PatchEventType.RequestRespondersRequestToJoinAck
    | PatchEventType.RequestRespondersLeft
    | PatchEventType.RequestRespondersRemoved
    | PatchEventType.RequestRespondersAccepted
    | PatchEventType.RequestRespondersDeclined;

// PatchEventType Convenience Type
export type RequestEventType = RequestTeamEventTypes
    | PatchEventType.RequestChatNewMessage
    | PatchEventType.RequestCreated
    | PatchEventType.RequestDeleted
    | PatchEventType.RequestEdited;

// PatchEventType Convenience Type
export type UserEventType = PatchEventType.UserCreated
    | PatchEventType.UserEdited
    | PatchEventType.UserDeleted
    | PatchEventType.UserAddedToOrg
    | PatchEventType.UserRemovedFromOrg
    | PatchEventType.UserChangedRolesInOrg
    | PatchEventType.UserOnDuty
    | PatchEventType.UserOffDuty

// PatchEventType Convenience Type
export type OrgEventType = PatchEventType.OrganizationEdited
    | PatchEventType.OrganizationDeleted
    | PatchEventType.OrganizationRoleCreated
    | PatchEventType.OrganizationRoleEdited
    | PatchEventType.OrganizationRoleDeleted
    | PatchEventType.OrganizationAttributesUpdated
    | PatchEventType.OrganizationTagsUpdated

export type NotificationEventType = SilentNotificationEventType | NoisyNotificationEventType;

// PatchEventType Convenience Type
export type SilentNotificationEventType = PatchEventType.UserForceLogout
    | PatchEventType.RequestRespondersNotified
    | PatchEventType.RequestRespondersNotificationAck

// PatchEventType Convenience Type
export type NoisyNotificationEventType = PatchEventType.RequestRespondersJoined
    | PatchEventType.RequestRespondersLeft
    | PatchEventType.RequestRespondersAccepted
    | PatchEventType.RequestRespondersDeclined
    | PatchEventType.RequestRespondersRemoved
    | PatchEventType.RequestRespondersRequestToJoin

export type PatchEventParams = {
    [PatchEventType.UserForceLogout]: {
        userId: string,
        refreshToken: string
    },
    [PatchEventType.UserCreated]: {
        userId: string
    }
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
    [PatchEventType.RequestRespondersNotified]: {
        requestId: string
    },
    [PatchEventType.RequestRespondersNotificationAck]: {
        requestId: string
    },
    [PatchEventType.RequestRespondersRequestToJoin]: {
        orgId: string,
        responderId: string,
        requestId: string,
        positionId: string
    },
    [PatchEventType.RequestRespondersRequestToJoinAck]: {
        orgId: string,
        responderId: string,
        requestId: string,
        positionId: string
    },
    [PatchEventType.RequestRespondersAccepted]: {
        orgId: string,
        responderId: string,
        requestId: string,
        positionId: string
    }, 
    [PatchEventType.RequestRespondersJoined]: {
        orgId: string,
        responderId: string,
        requestId: string,
        positionId: string
    }, 
    [PatchEventType.RequestRespondersDeclined]: {
        orgId: string,
        responderId: string,
        requestId: string,
        positionId: string
    }, 
    [PatchEventType.RequestRespondersLeft]: {
        orgId: string,
        responderId: string,
        requestId: string,
        positionId: string
    }, 
    [PatchEventType.RequestRespondersRemoved]: {
        orgId: string,
        responderId: string,
        requestId: string,
        positionId: string
    }, 
    [PatchEventType.RequestChatNewMessage]: {
        orgId: string,
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
    // could add the CategorizedItemUpdates tyoe here if we want more granular logging/updating around 
    // the updates
    [PatchEventType.OrganizationAttributesUpdated]: {
        orgId: string
    },
    [PatchEventType.OrganizationTagsUpdated]: {
        orgId: string
    }
}

export type PatchEventPacket<T extends PatchEventType = PatchEventType> = {
    event: T,
    params: PatchEventParams[T],
    silent?: boolean
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











