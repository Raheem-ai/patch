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
}

 class API {

    base = `/api`

    namespaces = {
        users: `/users`
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
        }
    }

    client: ApiRoutes = {
        signUp: () => {
            return `${this.base}${this.namespaces.users}${this.server.signUp()}`
        },
        signIn: () => {
            return `${this.base}${this.namespaces.users}${this.server.signIn()}`
        },
        signOut: () => {
            return `${this.base}${this.namespaces.users}${this.server.signOut()}`
        }
    }
}

export default new API();