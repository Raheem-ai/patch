import { AtLeast } from '.';
import { User, HelpRequest, Location, Me, Organization, UserRole, MinOrg, ProtectedUser, MinUser, BasicCredentials, MinHelpRequest, ChatMessage, ResponderRequestStatuses, RequestType, HelpRequestFilter, AuthTokens, AppSecrets, PendingUser, EditableUser, RequestSkill } from './models';

// TODO: type makes sure param types match but doesn't enforce you pass anything but token
// changing args to be a single object would fix this and allow for specific apis to take extra params for things
// but also make sure the original params are required for the call...but would require
// all api function signatures to take an object of params vs a more natural function call. 
export type TokenContext = { token: string };
export type OrgContext = TokenContext & { orgId: string };
export type RequestContext = OrgContext & { requestId: string }


type Authenticated<T extends (...args: any) => Promise<any>> = (ctx: TokenContext, ...args: Parameters<T>) => ReturnType<T>
type AuthenticatedWithOrg<T extends (...args: any) => Promise<any>> = (ctx: OrgContext, ...args: Parameters<T>) => ReturnType<T>
type AuthenticatedWithRequest<T extends (...args: any) => Promise<any>> = (ctx: RequestContext, ...args: Parameters<T>) => ReturnType<T>

// these check if you are logged in
type SSAuthenticated<T extends (...args: any) => Promise<any>, User> = (user: User, ...args: Rest<Parameters<T>>) => ReturnType<T>

// these check that you have the specified role for a given org
type SSAuthenticatedWithOrg<T extends (...args: any) => Promise<any>, User> = (orgId: string, user: User, ...args: Rest<Parameters<T>>) => ReturnType<T>

// these check that you're either a dispatcher for the org or 
// a responder currently assigned to the request
type SSAuthenticatedWithRequest<T extends (...args: any) => Promise<any>, Req, User> = (orgId: string, user: User, helpRequest: Req, ...args: Rest<Parameters<T>>) => ReturnType<T>

type Rest<T extends any[]> = T extends [any, ...infer U] ? U : never;

export type ServerSide<Req, User> = {
    [ api in keyof IApiClient ]: Parameters<IApiClient[api]>[0] extends RequestContext
        ? SSAuthenticatedWithRequest<IApiClient[api], Req, User>
        : Parameters<IApiClient[api]>[0] extends OrgContext
            ? SSAuthenticatedWithOrg<IApiClient[api], User>
            : Parameters<IApiClient[api]>[0] extends TokenContext
                ? SSAuthenticated<IApiClient[api], User>
                : IApiClient[api]
}


// need these to handle mapping from client side to serverside types ie. the Map class on the server and 
// an object on the client
type MapJson<T = Map<string | number, any>> = T extends Map<any, infer V> ? { [key: string]: V } : never;

export type ClientSideFormat<T> = {
    [key in keyof T]: T[key] extends Map<any, any> 
        ? MapJson<T[key]>
        : T[key]
}
 
type UnwrapPromise<T> = T extends Promise<infer U> ? U : never;

type ClientSide<T extends (...args: any) => Promise<any>> = (...args: Parameters<T>) => Promise<ClientSideFormat<UnwrapPromise<ReturnType<T>>>>

export type ClientSideApi<ToChange extends keyof IApiClient> = {
    [ api in keyof IApiClient ]: api extends ToChange
        ? ClientSide<IApiClient[api]>
        : IApiClient[api]
}

export interface IApiClient {
    // no auth
    signUp: (minUser: MinUser) => Promise<AuthTokens>
    signIn: (credentials: BasicCredentials) => Promise<AuthTokens>
    refreshAuth: (refreshToken: string) => Promise<string>
    signUpThroughOrg: (orgId: string, pendingId: string, user: MinUser) => Promise<AuthTokens>
    
    // must be signed in
    signOut: Authenticated<() => Promise<void>>
    me: Authenticated<() => Promise<Me>>
    reportLocation: Authenticated<(locations: Location[]) => Promise<void>>
    reportPushToken: Authenticated<(token: string) => Promise<void>>
    createOrg: Authenticated<(org: MinOrg) => Promise<{ user: Me, org: Organization }>>
    getSecrets: Authenticated<() => Promise<AppSecrets>>
    editMe: Authenticated<(me: Partial<Me>) => Promise<Me>>

    // must be signed in and have the correct rolls within th target org
    broadcastRequest: AuthenticatedWithOrg<(requestId: string, to: string[]) => Promise<void>>
    assignRequest: AuthenticatedWithOrg<(requestId: string, to: string[]) => Promise<HelpRequest>>
    confirmRequestAssignment: AuthenticatedWithOrg<(requestId: string) => Promise<HelpRequest>>
    declineRequestAssignment: AuthenticatedWithOrg<(requestId: string) => Promise<HelpRequest>>
    addUserToOrg: AuthenticatedWithOrg<(userId: string, roles: UserRole[]) => Promise<{ user: ProtectedUser, org: Organization }>>
    removeUserFromOrg: AuthenticatedWithOrg<(userId: string) => Promise<{ user: ProtectedUser, org: Organization }>>
    removeUserRoles: AuthenticatedWithOrg<(userId: string, roles: UserRole[]) => Promise<ProtectedUser>>
    addUserRoles: AuthenticatedWithOrg<(userId: string, roles: UserRole[]) => Promise<ProtectedUser>>

    inviteUserToOrg: AuthenticatedWithOrg<(email: string, phone: string, roles: UserRole[], skills: RequestSkill[], baseUrl: string) => Promise<PendingUser>>
    

    setOnDutyStatus: AuthenticatedWithOrg<(onDuty: boolean) => Promise<Me>>;
    createNewRequest: AuthenticatedWithOrg<(request: MinHelpRequest) => Promise<HelpRequest>>
    getRespondersOnDuty: AuthenticatedWithOrg<() => Promise<ProtectedUser[]>>
    getRequests: AuthenticatedWithOrg<(requestIds?: string[]) => Promise<HelpRequest[]>>
    getRequest: AuthenticatedWithOrg<(requestId: string) => Promise<HelpRequest>>
    getTeamMembers: AuthenticatedWithOrg<(userIds?: string[]) => Promise<ProtectedUser[]>>
    
    editUser: AuthenticatedWithOrg<(userId: string, user: Partial<EditableUser>) => Promise<ProtectedUser>>
    joinRequest: AuthenticatedWithOrg<(requestId: string) => Promise<HelpRequest>>
    leaveRequest: AuthenticatedWithOrg<(requestId: string) => Promise<HelpRequest>>
    removeUserFromRequest: AuthenticatedWithOrg<(userId: string, requestId: string) => Promise<HelpRequest>>
    
    editRequest: AuthenticatedWithRequest<(requestUpdates: AtLeast<HelpRequest, 'id'>) => Promise<HelpRequest>>
    unAssignRequest: AuthenticatedWithRequest<(userId: string) => Promise<void>>
    sendChatMessage: AuthenticatedWithRequest<(message: string) => Promise<HelpRequest>>
    updateRequestChatReceipt: AuthenticatedWithRequest<(lastMessageId: number) => Promise<HelpRequest>>
    setRequestStatus: AuthenticatedWithRequest<(status: ResponderRequestStatuses) => Promise<HelpRequest>>
    resetRequestStatus: AuthenticatedWithRequest<() => Promise<HelpRequest>>

    

    // getResources: () => string
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
        organization: '/organization',
        request: '/request'
    }

    orgIdHeader = 'X-Raheem-Org'
    requestIdHeader = 'X-Raheem-Request'

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
        editMe: () => {
            return `/editMe`
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
        createNewRequest: () => {
            return '/createNewRequest'
        },
        getRespondersOnDuty: () => {
            return '/getRespondersOnDuty'
        },
        getRequests: () => {
            return '/getRequests'
        },
        getRequest: () => {
            return '/getRequest'
        },
        editRequest: () => {
            return '/editRequest'
        },
        getTeamMembers: () => {
            return '/getTeamMembers'
        },
        unAssignRequest: () => {
            return '/unAssignRequest'
        },
        sendChatMessage: () => {
            return '/sendChatMessage'
        },
        setRequestStatus: () => {
            return '/setRequestStatus'
        },
        resetRequestStatus: () => {
            return '/resetRequestStatus'
        },
        setOnDutyStatus: () => {
            return '/setOnDutyStatus'
        }, 
        updateRequestChatReceipt: () => {
            return '/updateRequestChatReceipt'
        },
        refreshAuth: () => {
            return '/refreshAuth'
        },
        getSecrets: () => {
            return '/getSecrets'
        },
        joinRequest: () => {
            return '/joinRequest'
        },
        leaveRequest: () => {
            return '/leaveRequest'
        },
        removeUserFromRequest: () => {
            return '/removeUserFromRequest'
        },
        inviteUserToOrg: () => {
            return '/inviteUserToOrg'
        },
        signUpThroughOrg: () => {
            return '/signUpThroughOrg'
        },
        editUser: () => {
            return '/editUser'
        },
    }

    client: ApiRoutes = {
        // users
        signUp: () => {
            return `${this.base}${this.namespaces.users}${this.server.signUp()}`
        },
        signUpThroughOrg: () => {
            return `${this.base}${this.namespaces.users}${this.server.signUpThroughOrg()}`
        },
        signIn: () => {
            return `${this.base}${this.namespaces.users}${this.server.signIn()}`
        },
        signOut: () => {
            return `${this.base}${this.namespaces.users}${this.server.signOut()}`
        },
        refreshAuth: () => {
            return `${this.base}${this.namespaces.users}${this.server.refreshAuth()}`
        },
        me: () => {
            return `${this.base}${this.namespaces.users}${this.server.me()}`
        },
        editMe: () => {
            return `${this.base}${this.namespaces.users}${this.server.editMe()}`
        },
        editUser: () => {
            return `${this.base}${this.namespaces.users}${this.server.editUser()}`
        },
        reportLocation: () => {
            return `${this.base}${this.namespaces.users}${this.server.reportLocation()}`
        },
        reportPushToken: () => {
            return `${this.base}${this.namespaces.users}${this.server.reportPushToken()}`
        },
        // putting this here because there isn't a great place for it and it doesn't deserve it's own 
        // controller *kanye shrug*
        getSecrets: () => {
            return `${this.base}${this.namespaces.users}${this.server.getSecrets()}`
        },

        // dispatch
        broadcastRequest: () => {
            return `${this.base}${this.namespaces.dispatch}${this.server.broadcastRequest()}`
        },
        assignRequest: () => {
            return `${this.base}${this.namespaces.dispatch}${this.server.assignRequest()}`
        },
        removeUserFromRequest: () => {
            return `${this.base}${this.namespaces.dispatch}${this.server.removeUserFromRequest()}`
        },

        // respond
        setOnDutyStatus: () => {
            return `${this.base}${this.namespaces.responder}${this.server.setOnDutyStatus()}`
        },
        confirmRequestAssignment: () => {
            return `${this.base}${this.namespaces.responder}${this.server.confirmRequestAssignment()}`
        },
        declineRequestAssignment: () => {
            return `${this.base}${this.namespaces.responder}${this.server.declineRequestAssignment()}`
        },
        leaveRequest: () => {
            return `${this.base}${this.namespaces.responder}${this.server.leaveRequest()}`
        },
        joinRequest: () => {
            return `${this.base}${this.namespaces.responder}${this.server.joinRequest()}`
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
        getTeamMembers: () => {
            return `${this.base}${this.namespaces.organization}${this.server.getTeamMembers()}`
        },
        getRespondersOnDuty: () => {
            return `${this.base}${this.namespaces.organization}${this.server.getRespondersOnDuty()}`
        },
        inviteUserToOrg: () => {
            return `${this.base}${this.namespaces.organization}${this.server.inviteUserToOrg()}`
        },

        // request
        createNewRequest: () => {
            return `${this.base}${this.namespaces.request}${this.server.createNewRequest()}`
        },
        getRequests: () => {
            return `${this.base}${this.namespaces.request}${this.server.getRequests()}`
        },
        getRequest: () => {
            return `${this.base}${this.namespaces.request}${this.server.getRequest()}`
        },
        editRequest: () => {
            return `${this.base}${this.namespaces.request}${this.server.editRequest()}`
        },
        unAssignRequest: () => {
            return `${this.base}${this.namespaces.request}${this.server.unAssignRequest()}`
        },
        sendChatMessage: () => {
            return `${this.base}${this.namespaces.request}${this.server.sendChatMessage()}`
        },
        setRequestStatus: () => {
            return `${this.base}${this.namespaces.request}${this.server.setRequestStatus()}`
        },
        resetRequestStatus: () => {
            return `${this.base}${this.namespaces.request}${this.server.resetRequestStatus()}`
        },
        updateRequestChatReceipt: () => {
            return `${this.base}${this.namespaces.request}${this.server.updateRequestChatReceipt()}`
        }
    }
}

export default new API();