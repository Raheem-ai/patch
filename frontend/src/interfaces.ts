import { User } from '../../common/models'

export interface IUserStore {
    user: User;
    signedIn: boolean;
    signIn(email: string, password: string): Promise<boolean>
    signUp(email: string, password: string): Promise<void>
    signOut(): Promise<void>
}

export namespace IUserStore {
    export const id = Symbol('IUserStore');
}

export type Notifications = {
    
}
