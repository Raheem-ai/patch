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