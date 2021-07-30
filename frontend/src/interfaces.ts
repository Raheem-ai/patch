import { User } from '../../common/models'
import * as Location from 'expo-location';

export interface IUserStore {
    user: User;
    signedIn: boolean;
    signIn(email: string, password: string): Promise<void>
    signUp(email: string, password: string): Promise<void>
    signOut(): Promise<void>
}

export namespace IUserStore {
    export const id = Symbol('IUserStore');
}

export interface ILocationStore {
    hasForegroundPermission: boolean
    hasBackgroundPermission: boolean 
    hasFullPermission: boolean 
    askForPermission(): Promise<boolean>
    getLocation(): Promise<Location.LocationObject>
    watchLocation(cb: (location: Location.LocationObject) => void): Promise<void>
}

export namespace ILocationStore {
    export const id = Symbol('ILocationStore')
    export const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK'
}
