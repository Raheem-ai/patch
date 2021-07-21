import { User, ResponseRequest } from './models';

// ignore this for now
export type APIService = {
    // User Management
    signOut(): Promise<void>

    // Dispatch
    dispatch(users: User[], request: ResponseRequest): Promise<void>
    broadcast(request: ResponseRequest): Promise<void>

}

export const APIRoutes = {
    signUp: () => '/signup',
    signIn: () => '/signin',   
    signOut: () => '/signout',

    dispatch: () => `/dispatch`,
    broadcast: () => '/broadcast'
}