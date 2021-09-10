import { User, HelpRequest, Location, Me, Organization, UserRole, MinOrg, ProtectedUser, MinUser, BasicCredentials } from './models';

// TODO: type makes sure param types match but doesn't enforce you pass anything but token
// changing args to be a single object would fix this and allow for specific apis to take extra params for things
// but also make sure the original params are required for the call...but would require
// all api function signatures to take an object of params vs a more natural function call. 
type AuthenticatedWithOrg<T extends (...args: any) => Promise<any>> = (token: string, orgId: string, ...args: Parameters<T>) => ReturnType<T>
type Authenticated<T extends (...args: any) => Promise<any>> = (token: string, ...args: Parameters<T>) => ReturnType<T>
type SSAuthenticated<T extends (...args: any) => Promise<any>, Req> = (req: Req, ...args: Parameters<T>) => ReturnType<T>
type SSAuthenticatedWithOrg<T extends (...args: any) => Promise<any>, Req> = (req: Req, orgId: string, ...args: Parameters<T>) => ReturnType<T>

export type ServerSide<Req> = {
    [ api in keyof IApiClient ]: IApiClient[api] extends AuthenticatedWithOrg<infer Handler>
        ? SSAuthenticatedWithOrg<Handler, Req>
        : IApiClient[api] extends Authenticated<infer Handler>
            ? SSAuthenticated<Handler, Req>
            : IApiClient[api]
}

export interface IApiClient {
    // no auth
    signUp: (minUser: MinUser) => Promise<string>
    signIn: (credentials: BasicCredentials) => Promise<string>   
    
    // must be signed in
    signOut: Authenticated<() => Promise<void>>
    me: Authenticated<() => Promise<Me>>
    reportLocation: Authenticated<(locations: Location[]) => Promise<void>>
    reportPushToken: Authenticated<() => Promise<void>>
    createOrg: Authenticated<(org: MinOrg) => Promise<{ user: Me, org: Organization }>>

    // must be signed in and have the correct rolls within th target org
    broadcastRequest: AuthenticatedWithOrg<(requestId: string, to: string[]) => Promise<void>>
    assignRequest: AuthenticatedWithOrg<(requestId: string, to: string[]) => Promise<void>>
    confirmRequestAssignment: AuthenticatedWithOrg<(requestId: string) => Promise<void>>
    declineRequestAssignment: AuthenticatedWithOrg<(requestId: string) => Promise<void>>
    addUserToOrg: AuthenticatedWithOrg<(userId: string, roles: UserRole[]) => Promise<{ user: ProtectedUser, org: Organization }>>
    removeUserFromOrg: AuthenticatedWithOrg<(userId: string) => Promise<{ user: ProtectedUser, org: Organization }>>
    removeUserRoles: AuthenticatedWithOrg<(userId: string, roles: UserRole[]) => Promise<ProtectedUser>>
    addUserRoles: AuthenticatedWithOrg<(userId: string, roles: UserRole[]) => Promise<ProtectedUser>>

        // createNewRequest: () => string
    // getRespondersOnDuty: () => string
    // sendChatMessage: () => string
    // unAssignRequest: () => string
    // setTeamStatus: () => string
    // finishRequest: () => string
    // getResources: () => string
    // getRequests: () => string
    // getTeamMembers: () => string
}

type ApiRoutes = {
    [key in keyof IApiClient]: () => string
}

 class API {

    base = `/api`

    namespaces = {
        users: `/users`,
        dispatch: `/dispatch`,
        responder: '/responder',
        organization: '/organization'
    }

    orgIDHeader = 'X-Raheem-Org'

    server: ApiRoutes = {
        signUp: () => {
            return `/signup`
        },
        signIn: () => {
            return `/signin`
        },
        signOut: () => {
            return `/signout`
        },
        me: () => {
            return `/me`
        },
        broadcastRequest: () => {
            return '/broadcastRequest'
        },
        reportLocation: () => {
            return '/reportLocation'
        }, 
        reportPushToken: () => {
            return '/reportPushToken'
        },
        assignRequest: () => {
            return '/assignIncident'
        },
        confirmRequestAssignment: () => {
            return '/confirmIncidentAssignment'
        },
        declineRequestAssignment: () => {
            return '/declineIncidentAssignment'
        }, 
        createOrg: () => {
            return '/createOrg'
        },
        addUserToOrg: () => {
            return '/addUserToOrg'
        },
        removeUserFromOrg: () => {
            return '/removeUserFromOrg'
        },
        removeUserRoles: () => {
            return '/removeUserRole'
        },
        addUserRoles: () => {
            return '/addUserRole'
        },
    }

    client: ApiRoutes = {
        // users
        signUp: () => {
            return `${this.base}${this.namespaces.users}${this.server.signUp()}`
        },
        signIn: () => {
            return `${this.base}${this.namespaces.users}${this.server.signIn()}`
        },
        signOut: () => {
            return `${this.base}${this.namespaces.users}${this.server.signOut()}`
        },
        me: () => {
            return `${this.base}${this.namespaces.users}${this.server.me()}`
        },
        reportLocation: () => {
            return `${this.base}${this.namespaces.users}${this.server.reportLocation()}`
        },
        reportPushToken: () => {
            return `${this.base}${this.namespaces.users}${this.server.reportPushToken()}`
        },

        // dispatch
        broadcastRequest: () => {
            return `${this.base}${this.namespaces.dispatch}${this.server.broadcastRequest()}`
        },
        assignRequest: () => {
            return `${this.base}${this.namespaces.dispatch}${this.server.assignRequest()}`
        },

        // respond
        confirmRequestAssignment: () => {
            return `${this.base}${this.namespaces.responder}${this.server.confirmRequestAssignment()}`
        },
        declineRequestAssignment: () => {
            return `${this.base}${this.namespaces.responder}${this.server.declineRequestAssignment()}`
        },

        // organization
        createOrg: () => {
            return `${this.base}${this.namespaces.organization}${this.server.createOrg()}`
        },
        addUserToOrg: () => {
            return `${this.base}${this.namespaces.organization}${this.server.addUserToOrg()}`
        },
        removeUserFromOrg: () => {
            return `${this.base}${this.namespaces.organization}${this.server.removeUserFromOrg()}`
        },
        removeUserRoles: () => {
            return `${this.base}${this.namespaces.organization}${this.server.removeUserRoles()}`
        },
        addUserRoles: () => {
            return `${this.base}${this.namespaces.organization}${this.server.addUserRoles()}`
        },
    }
}

export default new API();