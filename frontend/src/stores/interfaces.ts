import { Notification, NotificationResponse } from 'expo-notifications';
import { User, Location, NotificationPayload, NotificationType, Me } from '../../../common/models'

export interface IBaseStore {
    init?(): Promise<void>
}

export interface IUserStore extends IBaseStore {
    user: Me;
    signedIn: boolean;
    authToken: string;
    signIn(email: string, password: string): Promise<void>
    signUp(email: string, password: string): Promise<void>
    signOut(): Promise<void>
}

export namespace IUserStore {
    export const id = Symbol('IUserStore');
}

export interface ILocationStore extends IBaseStore {
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
    reportLocation(token: string, locations: Location[]): Promise<void>;
}

export namespace ILocationStore {
    export const id = Symbol('ILocationStore')
    export const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK'
    export const SHIFT_END_TIME = 'SHIFT_END_TIME'
}


export interface INotificationStore extends IBaseStore {
    // hasPermission: boolean;
    setup(): void;
    teardown(): void;
    askForPermission(): Promise<boolean> 
    updatePushToken(): Promise<void>;
    onNotification<T extends NotificationType>(type: T, cb: (data: NotificationPayload<T>, notification: Notification) => void): [T, string];
    offNotification<T extends NotificationType>(params: [T,string]);
    onNotificationResponse<T extends NotificationType>(type: T, cb: (data: NotificationPayload<T>, res: NotificationResponse) => void): [T, string];
    offNotificationResponse<T extends NotificationType>(params: [T, string]);
    handlePermissions(): Promise<void>
}

export namespace INotificationStore {
    export const id = Symbol('INotificationStore');
    export const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK'
}

export namespace IDispatchStore {
    export const id = Symbol('IDispatchStore');
}

export interface IDispatchStore extends IBaseStore {
    broadcastRequest(requestId: string, to: string[]): Promise<void>
    assignRequest(requestId: string, to: string[]): Promise<void>
}