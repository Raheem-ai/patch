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
    dispatch: () => string
    reportLocation: () => string
    reportPushToken: () => string
}

 class API {

    base = `/api`

    namespaces = {
        users: `/users`,
        dispatch: `/dispatch`
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
        dispatch: () => {
            return '/dispatch'
        },
        reportLocation: () => {
            return '/reportLocation'
        }, 
        reportPushToken: () => {
            return '/reportPushToken'
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
        reportLocation: () => {
            return `${this.base}${this.namespaces.users}${this.server.reportLocation()}`
        },
        reportPushToken: () => {
            return `${this.base}${this.namespaces.users}${this.server.reportPushToken()}`
        },

        // dispatch
        dispatch: () => {
            return `${this.base}${this.namespaces.dispatch}${this.server.dispatch()}`
        }
    }
}

export default new API();