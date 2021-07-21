import { User } from '../../common/models'

export type UserStore = {
    user: User;
    loading: boolean;
    signIn(): Promise<void>
    signUp(): Promise<void>
    signOut(): Promise<void>
}

export type Notifications = {
    
}
