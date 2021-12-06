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
    pronouns?: string[]
    bio?: string
    // location?
}

export type UserOrgConfig = {
    roles: UserRole[],
    onDuty: boolean
}

export type MinUser = AtLeast<User, 'email' | 'password' | 'name'>

export type ProtectedUser = Omit<User, 'password' | 'race'>;

// this will change from being the same as ProtectedUser when we get
// more profile fields
export type Me = Omit<User, 'password'>

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
}

export type MinOrg = AtLeast<Organization, 'name'>;

export type PendingUser = {
    email: string 
    phone: string 
    roles: UserRole[]
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
    Spanish = RequestSkillCategory.Languages + ':sp',
    French = RequestSkillCategory.Languages + ':fr'
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
    [RequestSkill.Spanish]: 'Spanish',
    [RequestSkill.French]: 'French',
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
    BroadCastedIncident = 'bi'
}

export type NotificationPayloads = {
    [NotificationType.AssignedIncident] : {
        id: string,
        orgId: string
    },
    [NotificationType.BroadCastedIncident]: {
        id: string,
        orgId: string
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
        pendingId: string
    },
    [LinkExperience.JoinOrganization]: {
        orgId: string,
        email: string,
        roles: UserRole[],
        pendingId: string
    } 
} 