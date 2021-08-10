import { Notification, NotificationResponse } from 'expo-notifications';
import { User, Location, NotificationPayload, NotificationType } from '../../common/models'

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
    foregroundCallbacks: ((loc: Location) => void)[]

    askForPermission(): Promise<boolean>
    getCurrentLocation(): Promise<Location>
    startWatchingLocation(): Promise<void>
    stopWatchingLocation(): Promise<void>
    addForegroundCallback(cb: (loc: Location) => Promise<void> | void): string;
    removeForegroundCallback(handle: string): void;
    reportLocation(locations: Location[]): Promise<void>;
}

export namespace ILocationStore {
    export const id = Symbol('ILocationStore')
    export const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK'
    export const SHIFT_END_TIME = 'SHIFT_END_TIME'
}


export interface INotificationStore {
    hasPermission: boolean;
    askForPermission(): Promise<boolean> 
    updatePushToken(): Promise<void>;
    onNotification<T extends NotificationType>(type: T, cb: (data: NotificationPayload<T>, notification: Notification) => void): void;
    onNotificationResponse<T extends NotificationType>(type: T, cb: (data: NotificationPayload<T>, res: NotificationResponse) => void): void;
    startListeningForNotifications(): Promise<void>
}

export namespace INotificationStore {
    export const id = Symbol('INotificationStore');
}