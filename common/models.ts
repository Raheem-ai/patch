import { AtLeast } from '.';
import { allEnumValues } from './utils';

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

export type EditableUser = Pick<ProtectedUser, 'skills'>
export type EditableMe = Omit<Me, 'organizations' | 'skills'>

export type UserOrgConfig = {
    roles: UserRole[],
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
    members: ProtectedUser[];
    lastRequestId: number;
    lastDayTimestamp: string;
    pendingUsers: PendingUser[]
    removedMembers: ProtectedUser[]
}

export type MinOrg = AtLeast<Organization, 'name'>;

export type PendingUser = {
    email: string 
    phone: string 
    roles: UserRole[]
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
    notes: string
    skills: RequestSkill[]
    // otherRequirements?: any //TODO: nix these until later on
    respondersNeeded: number
    chat: Chat
    dispatcherId: string
    status: RequestStatus
    createdAt: string
    updatedAt: string

    assignments: HelpRequestAssignment[]
    assignedResponderIds: string[]
    declinedResponderIds: string[]
    // removedResponderIds: string[]
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

export type MinHelpRequest = AtLeast<HelpRequest, 'location' | 'type' | 'respondersNeeded' | 'skills'>

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
    [RequestStatus.PartiallyAssigned]: (req: HelpRequest) => `${req.assignedResponderIds.length} of ${req.respondersNeeded}`,
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
        requestId: string
    }, 
    [PatchEventType.RequestRespondersJoined]: {
        responderId: string,
        requestId: string
    }, 
    [PatchEventType.RequestRespondersDeclined]: {
        responderId: string,
        requestId: string
    }, 
    [PatchEventType.RequestRespondersLeft]: {
        responderId: string,
        requestId: string
    }, 
    [PatchEventType.RequestRespondersRemoved]: {
        responderId: string,
        requestId: string
    }, 
    [PatchEventType.RequestChatNewMessage]: {
        requestId: string,
        userId: string
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
        userList?: boolean,
        requestList?: boolean
    },
}

export type PatchUIEventPacket<UIEvent extends PatchUIEvent = any, SysEvent extends PatchEventType = any> = {
    event: UIEvent
    params: PatchUIEventParams[UIEvent]
    sysEvent: SysEvent
    sysParams: PatchEventParams[SysEvent]
}

export enum PatchPermissions {
    // Edit organization settings
    EditOrgSettings = 'editOrgSettings',
    // Create, edit, and delete org Roles
    RoleAdmin = 'roleAdmin',
    // Create, edit, and delete org Attributes
    AttributeAdmin = 'attributeAdmin',
    // Create, edit, and delete org Tags
    TagAdmin = 'tagAdmin',
    // Export org data
    ExportData = 'exportData',
    // Invite people to org
    InviteToOrg = 'inviteToOrg',
    // Remove people from org
    RemoveFromOrg = 'removeFromOrg',
    // Assign Roles to people in org
    AssignRoles = 'assignRoles',
    // Assign Attributes to people in org
    AssignAttributes = 'assignAttributes',
    // Delete my account from PATCH
    DeleteMyAccount = 'deleteMyAccount',
    // Edit my own PATCH profile
    EditMyProfile = 'editMyProfile',
    // Remove myself from org
    RemoveSelfFromOrg = 'removeSelfFromOrg',
    // Create and manage chats
    ChatAdmin = 'chatAdmin',
    // Invite people to chats (user can see)
    InviteToChat = 'inviteToChat',
    // See all chats in org (incl. all request/shift chats)
    SeeAllChats = 'seeAllChats',
    // Create and manage shifts
    ShiftAdmin = 'shiftAdmin',
    // Create and manage all requests
    RequestAdmin = 'requestAdmin',
    // Edit data for requests (user is on)
    EditRequestData = 'editRequestData',
    // Close requests (user is on)
    CloseRequests = 'closeRequests'
}