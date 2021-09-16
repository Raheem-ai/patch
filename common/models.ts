import { AtLeast } from '.';

export interface User {
    id: string;
    name: string;
    email: string;
    password: string;
    organizations: Map<string, {
        roles: UserRole[]
    }>

    race?: string
}

export type MinUser = AtLeast<User, 'email' | 'password'>

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
    members: ProtectedUser[]
}

export type MinOrg = AtLeast<Organization, 'name'>;

export enum UserRole {
    Admin,
    Dispatcher,
    Responder
}

export type HelpRequest = {
    id: string
    orgId: string
    location: Location
    type: RequestType
    notes: string
    skills: RequestSkill[]
    otherRequirements?: any //TODO: what are these exactly?
    respondersNeeded: number
    chat: ChatMessage[]
    dispatcherId: string,
    responderIds: string[]
    status: RequestStatus
}

export type MinHelpRequest = AtLeast<HelpRequest, 'location' | 'type' | 'respondersNeeded'>

export type ChatMessage = {
    userId: string,
    message: string,
    timestamp: number
}

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

export type ResponderRequestStatuses = 
    RequestStatus.OnTheWay
    | RequestStatus.OnSite
    | RequestStatus.Done;

export enum RequestSkill {

}

export enum RequestType {
    ConflictResolution,
    CopWatching,
    Counseling,
    DomesticDisturbance,
    FirstAid,
    Housing,
    MentalHealthCrisis,
    ProvidingSupplies,
    ResourceReferral,
    SubstanceCounceling,
    Transportation,
    WellnessCheck
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
    AssignedIncident = 'assignedIncident',
    BroadCastedIncident = 'broadcastedIncident'
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