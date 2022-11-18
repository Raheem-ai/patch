import { makeAutoObservable, runInAction, when } from "mobx";
import { Store } from "./meta";
import * as Notifications from 'expo-notifications';
import {Notification, NotificationResponse} from 'expo-notifications';
import { PermissionStatus } from "expo-modules-core";
import { Platform } from "react-native";
import { INotificationStore, navigationStore, notificationStore, requestStore, updateStore, userStore } from "./interfaces";
import { NotificationEventType, PatchEventPacket, PatchEventType, PatchNotification } from "../../../common/models";
import { notificationLabel } from "../../../common/utils/notificationUtils";
import { NotificationHandlerDefinition, NotificationHandlers, NotificationResponseDefinition } from "../notifications/notificationActions";
import * as TaskManager from 'expo-task-manager';
import { navigateTo } from "../navigation";
import * as uuid from 'uuid';
import * as Device from 'expo-device';
import Constants from "expo-constants";
import { securelyPersistent } from "../meta";
import { api } from "../services/interfaces";

@Store(INotificationStore)
export default class NotificationStore implements INotificationStore {
    
    // TODO: set badge number on app 

    private notificationResponseCallbacks = new Map<PatchEventType, { [id: string]: ((data: PatchEventPacket<any>,  res: NotificationResponse) => void) }>();

    // in case we want to stop listening at some point
    private notificationsSub = null;
    private notificationResponseSub = null;

    constructor() { 
        makeAutoObservable(this);
    }

    clear() {}

    static async registerInteractiveNotifications() {
        for (const PatchEventType in NotificationHandlers) {
            const handler: NotificationHandlerDefinition = NotificationHandlers[PatchEventType];
            const actions = handler.actions?.();

            if (actions && actions.length) {
                await Notifications.setNotificationCategoryAsync(PatchEventType, actions)       
            } 
        }
    }

    async init() {
        await userStore().init()
        await updateStore().init()
        await navigationStore().init()
        await requestStore().init()

        if (userStore().signedIn) {
            await this.handlePermissionsAfterSignin()
        } else {
            when(() => userStore().signedIn, this.handlePermissionsAfterSignin)
        }
    }

    handlePermissionsAfterSignin = async () => {
        await this.handlePermissions();

        when(() => !userStore().signedIn, () => {
            when(() => userStore().signedIn, this.handlePermissionsAfterSignin)
        })
    }

    async handlePermissions() {
        if (Device.isDevice) {
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
        const token = userStore().authToken;

        await api().reportPushToken({ token }, currentPushToken);
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

    // when getting an event from the socket this is not tricggeting the whole loop 
    async onEvent(patchNotification: PatchNotification) {
        console.log('notificationStore().onEvent()')
        await Notifications.scheduleNotificationAsync({
            content: {
                body: patchNotification.body,
                data: patchNotification.payload,
                categoryIdentifier: patchNotification.payload.event
            },
            trigger: null
        })
    }

    /**
     * 1) need to test socket scenario against staging...or figure out how to test it locally?
     * 2) Should we have a handleNotificationFromSocket()? function
     */

    // 2) this gets run after showing/not showing the real notification that came in
    handleNotification = async <T extends NotificationEventType>(notification: Notification) => {
        const payload = notification.request.content.data as PatchEventPacket<T>;
        const type = payload.event as T;

        console.log('handleNotificatoin: ', type)

        const notificationHandler = NotificationHandlers[type];
        
        if (notificationHandler && notificationHandler.onNotificationRecieved) {
            await notificationHandler.onNotificationRecieved(payload)
        }

        if (notificationHandler && !notificationHandler.dontForwardUpdates) {
            await updateStore().onEvent(payload)
        }
    }

    handleNotificationResponse = async <T extends NotificationEventType>(res: NotificationResponse) => {
        const payload = res.notification.request.content.data as PatchEventPacket<T>;
        const type = payload.event as T;
        const actionId = res.actionIdentifier;

        const notificationHandler = NotificationHandlers[type];
        
        if (res.actionIdentifier == 'expo.modules.notifications.actions.DEFAULT') {
            const newRoute = notificationHandler.defaultRouteTo(payload);

            if (newRoute) {
                navigateTo(newRoute, {
                    notification: payload as any // we take in general type here but the notification params in the RootStackParamList are more specific 
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
                notification: payload as any
            })
        } else if (handler.options.opensAppToForeground == false) { //explicitely checking for false for typing
            await handler.options.handler(payload);
        }
    }
}

// 1) this gets called by os when a real notification comes in
Notifications.setNotificationHandler({
    handleNotification: async (notification: Notification) => {
        const payload = notification.request.content.data as PatchEventPacket;
        const type = payload.event as PatchEventType;

        const notificationHandler = NotificationHandlers[type];

        if (notificationHandler 
            && !notificationHandler.dontShowNotification
            && !payload.silent
        ) {
            console.log('SHOULD SHOW: ', type)
            return {
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
            }
        } else {
            console.log('SHOULD NOT SHOW: ', type)
            return {
                shouldShowAlert: false,
                shouldPlaySound: false,
                shouldSetBadge: false,
            }
        }
    }
});

TaskManager.defineTask(INotificationStore.BACKGROUND_NOTIFICATION_TASK, async ({ data, error, executionInfo }) => {
    if (data) {
        if (Device.brand == "Apple") {
            const notification = data['UIApplicationLaunchOptionsRemoteNotificationKey'] as Notification;
            // const notification = data['UIApplicationLaunchOptionsRemoteNotificationKey'].body as PatchEventPacket;
            // const notification = data.notification.data.body as PatchEventPacket;

            await notificationStore().init()
            await notificationStore().handleNotification(notification);
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