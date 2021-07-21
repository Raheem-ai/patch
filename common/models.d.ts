export type User = {
    id: string;
    roles: UserRole[];
    name: string;
}

export enum UserRole {
    Dispatcher,
    Responder
}

export type ResponseRequest = {

}