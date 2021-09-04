import { User, ResponseRequest } from './models';

// ignore this for now
export type APIService = {
    // User Management
    signOut(): Promise<void>

    // Dispatch
    dispatch(users: User[], request: ResponseRequest): Promise<void>
    broadcast(request: ResponseRequest): Promise<void>

}

interface ApiRoutes {
    signUp: () => string
    signIn: () => string   
    signOut: () => string
    me: () => string
    dispatch: () => string
    reportLocation: () => string
    reportPushToken: () => string
    assignIncident: () => string
    confirmIncidentAssignment: () => string
    declineIncidentAssignment: () => string
}

 class API {

    base = `/api`

    namespaces = {
        users: `/users`,
        dispatch: `/dispatch`,
        responder: '/responder'
    }

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
        dispatch: () => {
            return '/dispatch'
        },
        reportLocation: () => {
            return '/reportLocation'
        }, 
        reportPushToken: () => {
            return '/reportPushToken'
        },
        assignIncident: () => {
            return '/assignIncident'
        },
        confirmIncidentAssignment: () => {
            return '/confirmIncidentAssignment'
        },
        declineIncidentAssignment: () => {
            return '/declineIncidentAssignment'
        }
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
        dispatch: () => {
            return `${this.base}${this.namespaces.dispatch}${this.server.dispatch()}`
        },
        assignIncident: () => {
            return `${this.base}${this.namespaces.dispatch}${this.server.assignIncident()}`
        },

        // respond
        confirmIncidentAssignment: () => {
            return `${this.base}${this.namespaces.responder}${this.server.confirmIncidentAssignment()}`
        },
        declineIncidentAssignment: () => {
            return `${this.base}${this.namespaces.responder}${this.server.declineIncidentAssignment()}`
        }
    }
}

export default new API();