import { makeAutoObservable, runInAction } from "mobx";
import { Store } from "../di";
import * as Notifications from 'expo-notifications';
import {Notification, NotificationResponse} from 'expo-notifications';
import { PermissionStatus } from "expo-modules-core";
import API from "../api";
import { Constants } from "react-native-unimodules";
import { Platform } from "react-native";
import { INotificationStore } from "../interfaces";
import { NotificationPayload, NotificationType } from "../../../common/models";
import { interactiveNotifications, NotificationResponseDefinition } from "../notifications/notificationActions";
import * as TaskManager from 'expo-task-manager';
import { navigateTo } from "../navigation";
import * as uuid from 'uuid';

@Store()
export default class NotificationStore implements INotificationStore {
    
    // TODO: set badge number on app 
    
    private notificationCallbacks = new Map<NotificationType, { [id: string]: ((data: NotificationPayload<any>,  notification: Notification) => void) }>();
    private notificationResponseCallbacks = new Map<NotificationType, { [id: string]: ((data: NotificationPayload<any>,  res: NotificationResponse) => void) }>();

    // in case we want to stop listening at some point
    private notificationsSub = null;
    private notificationResponseSub = null;
    
    constructor() { 
        makeAutoObservable(this);
    }

    static async registerInteractiveNotifications() {
        for (const notificationType in interactiveNotifications) {
            const actions = interactiveNotifications[notificationType] || [];

            if (actions.length) {
                await Notifications.setNotificationCategoryAsync(notificationType, actions)       
            } 
        }
    }

    setup() {
        this.notificationsSub = Notifications.addNotificationReceivedListener((notification: Notification) => {

            this.handleNotification(notification);
        });
        
        this.notificationResponseSub = Notifications.addNotificationResponseReceivedListener(async (res: NotificationResponse) => {
            if (res.actionIdentifier == 'expo.modules.notifications.actions.DEFAULT') {
                return;
            }
        
            const payload = res.notification.request.content.data as NotificationPayload<any>;
            const type = payload.type as NotificationType;
            const actionId = res.actionIdentifier;
        
            const responseDefs: NotificationResponseDefinition[] = interactiveNotifications[type];
            const handler = responseDefs.find((rd) => rd.identifier == actionId);
        
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

            this.handleNotificationResponse(res);
        
        });

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

    async askForPermission(): Promise<boolean> {
        try {
            let { status } = await Notifications.requestPermissionsAsync();
            
            if (status !== PermissionStatus.GRANTED) {
                console.log('Permission to receive push notifications was denied');
                // runInAction(() => this.hasPermission = false)
                return false;
            } else {
                console.log('Permission granted to receive push notifications')
                // runInAction(() => this.hasPermission = true)
                return true;
            }
        } catch (e) {
            console.log('Error requesting permission to receive push notifications: ', e);
            // runInAction(() => this.hasPermission = false)
            return false;
        }
    }

    async updatePushToken() {
        // don't keep copy on device
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        await API.reportPushToken(token);
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
        
        if (callbackMap[id]) {
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
        
        if (callbackMap[id]) {
            callbackMap[id] = undefined;
        }
    }

    // closure so it can be used as a callback and still reference 'this'
    handleNotification(notification: Notification) {
        const data = notification.request.content.data;
        const key = data.type as NotificationType;
        const callbackMap = this.notificationCallbacks.get(key)
        const callbacks = Object.values(callbackMap);

        if (callbacks && callbacks.length) {
            for (const cb of callbacks) {
                cb(data, notification)
            }
        }
    }
    
    // closure so it can be used as a callback and still reference 'this'
    handleNotificationResponse(res: NotificationResponse) {
        const data = res.notification.request.content.data;
        const key = data.type as NotificationType;
        const callbackMap = this.notificationResponseCallbacks.get(key)
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

// TaskManager.defineTask(INotificationStore.BACKGROUND_NOTIFICATION_TASK, ({ data, error, executionInfo }) => {
//     console.log('Received a notification in the background!');
//     console.log(data);
// });

// Notifications.registerTaskAsync(INotificationStore.BACKGROUND_NOTIFICATION_TASK);

(async function() {
    try {
        await NotificationStore.registerInteractiveNotifications()
        console.log('categories initialized')
    } catch (e) {
        console.error(e);
    }
})()