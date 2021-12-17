import { makeAutoObservable, runInAction, when } from "mobx";
import { getStore, Store } from "./meta";
import * as Notifications from 'expo-notifications';
import {Notification, NotificationResponse} from 'expo-notifications';
import { PermissionStatus } from "expo-modules-core";
import { Platform } from "react-native";
import { INotificationStore, IUserStore } from "./interfaces";
import { NotificationPayload, NotificationType } from "../../../common/models";
import { NotificationHandlerDefinition, NotificationHandlers, NotificationResponseDefinition } from "../notifications/notificationActions";
import * as TaskManager from 'expo-task-manager';
import { navigateTo } from "../navigation";
import * as uuid from 'uuid';
import * as Device from 'expo-device';
import { getService } from "../services/meta";
import { IAPIService } from "../services/interfaces";
import Constants from "expo-constants";
import { securelyPersistent } from "../meta";
// import Constants from 'expo-constants';

@Store(INotificationStore)
export default class NotificationStore implements INotificationStore {
    
    // TODO: set badge number on app 

    private userStore = getStore<IUserStore>(IUserStore);
    private api = getService<IAPIService>(IAPIService)

    private notificationCallbacks = new Map<NotificationType, { [id: string]: ((data: NotificationPayload<any>,  notification: Notification) => void) }>();
    private notificationResponseCallbacks = new Map<NotificationType, { [id: string]: ((data: NotificationPayload<any>,  res: NotificationResponse) => void) }>();

    // in case we want to stop listening at some point
    private notificationsSub = null;
    private notificationResponseSub = null;

    // keep copy in secure store and never delete it so we'll know when it needs to be updated
    // ie. reinstalls
    @securelyPersistent() expoPushToken = null;
    @securelyPersistent() expoPushTokenUserId: string = null;
    
    constructor() { 
        makeAutoObservable(this);
    }

    clear() {
        this.expoPushToken = null;
        this.expoPushTokenUserId = null;
    }

    async init() {
        await this.userStore.init();

        if (this.userStore.signedIn) {
            await this.handlePermissionsAfterSignin()
        } else {
            when(() => this.userStore.signedIn, this.handlePermissionsAfterSignin)
        }
    }

    handlePermissionsAfterSignin = async () => {
        await this.handlePermissions();

        when(() => !this.userStore.signedIn, () => {
            when(() => this.userStore.signedIn, this.handlePermissionsAfterSignin)
        })
    }

    static async registerInteractiveNotifications() {
        for (const notificationType in NotificationHandlers) {
            const handler: NotificationHandlerDefinition = NotificationHandlers[notificationType];
            const actions = handler.actions();

            if (actions && actions.length) {
                await Notifications.setNotificationCategoryAsync(notificationType, actions)       
            } 
        }
    }

    setup() {
        this.notificationsSub = Notifications.addNotificationReceivedListener(this.handleNotification);
        
        this.notificationResponseSub = Notifications.addNotificationResponseReceivedListener(this.handleNotificationResponse);

        if (Platform.OS === 'android') {
            // TODO: lookup what this is doing and test on android
            Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }
    }

    teardown() {
        Notifications.removeNotificationSubscription(this.notificationsSub)
        Notifications.removeNotificationSubscription(this.notificationResponseSub)
    }

    handleNotification = (notification: Notification) => {
        this.handleNotificationCallbacks(notification);
    }

    handleNotificationResponse = async (res: NotificationResponse) => {
        const payload = res.notification.request.content.data as NotificationPayload<any>;
        const type = payload.type as NotificationType;
        const actionId = res.actionIdentifier;

        const notificationHandler = NotificationHandlers[type];
        
        if (res.actionIdentifier == 'expo.modules.notifications.actions.DEFAULT') {
            if (notificationHandler.defaultRouteTo) {
                navigateTo(notificationHandler.defaultRouteTo, {
                    notification: {
                        type: type,
                        payload: payload
                    }
                })
            }

            return;
        }
    
        const responseDefs: NotificationResponseDefinition[] = notificationHandler.actions();
        const handler = responseDefs.find((rd) => rd.identifier == actionId);
    
        // not checking if handler exists because the only 
        // options the user is shown is from the NotificationResponseDefinition itself
        if (handler.options.opensAppToForeground) {
            const route = handler.options.routeTo;
    
            navigateTo(route, {
                notification: {
                    type: type,
                    payload: payload
                }
            })
        } else if (handler.options.opensAppToForeground == false) { //explicitely checking for false for typing
            await handler.options.handler(payload);
        }

        this.handleNotificationResponseCallbacks(res);
    }

    async askForPermission(): Promise<boolean> {
        try {
            let { status } = await Notifications.requestPermissionsAsync();
            
            if (status !== PermissionStatus.GRANTED) {
                console.log('Permission to receive push notifications was denied');
                return false;
            } else {
                console.log('Permission granted to receive push notifications')
                return true;
            }
        } catch (e) {
            console.log('Error requesting permission to receive push notifications: ', e);
            return false;
        }
    }

    async updatePushToken() {
        const currentPushToken = (await Notifications.getExpoPushTokenAsync()).data;
        const token = this.userStore.authToken;

        if (this.expoPushToken != currentPushToken || this.expoPushTokenUserId != this.userStore.user.id) {
            await this.api.reportPushToken({ token }, currentPushToken);
            
            runInAction(() => {
                this.expoPushToken = currentPushToken
                this.expoPushTokenUserId = this.userStore.user.id
            });
        }
    }

    onNotification<T extends NotificationType>(type: T, cb: (data: NotificationPayload<T>, notification: Notification) => void) {
        const callbackMap = this.notificationCallbacks.get(type)
        const id = uuid.v1();

        if (callbackMap) {
            callbackMap[id] = cb;
        } else {
            this.notificationCallbacks.set(type, { [id]: cb });
        }

        return [ type, id ] as [ T, string ]
    }

    offNotification<T extends NotificationType>(params: [T, string]) {
        const type = params[0];
        const id = params[1];

        const callbackMap = this.notificationCallbacks.get(type)
        
        if (callbackMap && callbackMap[id]) {
            callbackMap[id] = undefined;
        }
    }
    
    onNotificationResponse<T extends NotificationType>(type: T, cb: (data: NotificationPayload<T>, res: NotificationResponse) => void) {
        const callbackMap = this.notificationResponseCallbacks.get(type)
        const id = uuid.v1();

        if (callbackMap) {
            callbackMap[id] = cb;
        } else {
            this.notificationResponseCallbacks.set(type, { [id]: cb });
        }

        return [ type, id ] as [ T, string ]
    }

    offNotificationResponse<T extends NotificationType>(params: [T, string]) {
        const type = params[0];
        const id = params[1];
        const callbackMap = this.notificationResponseCallbacks.get(type)
        
        if (callbackMap && callbackMap[id]) {
            callbackMap[id] = undefined;
        }
    }

    // closure so it can be used as a callback and still reference 'this'
    handleNotificationCallbacks(notification: Notification) {
        const data = notification.request.content.data;
        const key = data.type as NotificationType;
        const callbackMap = this.notificationCallbacks.get(key)

        if (!callbackMap) {
            return;
        }

        const callbacks = Object.values(callbackMap);

        if (callbacks && callbacks.length) {
            for (const cb of callbacks) {
                cb(data, notification)
            }
        }
    }
    
    // closure so it can be used as a callback and still reference 'this'
    handleNotificationResponseCallbacks(res: NotificationResponse) {
        const data = res.notification.request.content.data;
        const key = data.type as NotificationType;
        const callbackMap = this.notificationResponseCallbacks.get(key)

        if (!callbackMap) {
            return;
        }

        const callbacks = Object.values(callbackMap);

        if (callbacks && callbacks.length) {
            for (const cb of callbacks) {
                cb(data, res)
            }
        }
    }

    async handlePermissions() {
        if (Constants.isDevice) {
            const perms = await Notifications.getPermissionsAsync()
        
            if (perms.status !== PermissionStatus.GRANTED) {
                const permissionGranted = await this.askForPermission()
                
                if (!permissionGranted) {
                    return;
                } else {
                    await this.updatePushToken();
                }                
            } else {
                await this.updatePushToken();
            }
        }
    }
}

Notifications.setNotificationHandler({
    handleNotification: async (notification: Notification) => {
        return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
        }
    }
});

TaskManager.defineTask(INotificationStore.BACKGROUND_NOTIFICATION_TASK, async ({ data, error, executionInfo }) => {
    if (data) {
        if (Device.brand == "Apple") {
            const notification = data['UIApplicationLaunchOptionsRemoteNotificationKey'].body as NotificationPayload<any> & { type : NotificationType };

            const userStore = getStore<IUserStore>(IUserStore);
            const api = getService<IAPIService>(IAPIService)

            await userStore.init()

            const token = userStore.authToken;
            
            switch (notification.type) {
                case NotificationType.AssignedIncident:
                    const orgId = (notification as NotificationPayload<NotificationType.AssignedIncident>).orgId
                    await api.declineRequestAssignment({ token, orgId }, notification)
                    break;
            
                default:
                    break;
            }
        } else if (Device.brand == "Google") {
            //TODO: figure out how to handle andoird scenario
        }
    } else if (error) {
        // TODO: error handling?
    }
});

Notifications.registerTaskAsync(INotificationStore.BACKGROUND_NOTIFICATION_TASK);

(async function() {
    try {
        await NotificationStore.registerInteractiveNotifications()
        console.log('categories initialized')
    } catch (e) {
        console.error(e);
    }
})()