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
    },
    [NotificationType.BroadCastedIncident]: {
        id: string
    }
}

export type NotificationPayload<T extends NotificationType> = NotificationPayloads[T];