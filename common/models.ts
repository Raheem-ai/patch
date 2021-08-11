export interface User {
    id: string;
    roles: UserRole[];
    name: string;
    email: string;
    password: string;
}

export enum UserRole {
    Dispatcher,
    Responder
}

export type ResponseRequest = {

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