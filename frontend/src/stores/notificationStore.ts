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

@Store()
export default class NotificationStore implements INotificationStore {
    
    // TODO: set badge number on app 
    
    public hasPermission = false;

    private notificationCallbacks = new Map<NotificationType, ((data: NotificationPayload<any>,  notification: Notification) => void)[]>();
    private notificationResponseCallbacks = new Map<NotificationType, ((data: NotificationPayload<any>,  res: NotificationResponse) => void)[]>();

    // in case we want to stop listening at some point
    private notificationsSub = null;
    private notificationResponseSub = null;
    
    constructor() { 
        makeAutoObservable(this);

        Notifications.getPermissionsAsync()
            .then((res) => {
                runInAction(() => this.hasPermission = res.status == PermissionStatus.GRANTED)
            })
            .catch((e) => {
                console.error(e)
                runInAction(() => this.hasPermission = false)
            })
    }

    async askForPermission(): Promise<boolean> {
        try {
            let { status } = await Notifications.requestPermissionsAsync();
            
            if (status !== PermissionStatus.GRANTED) {
                console.log('Permission to receive push notifications was denied');
                runInAction(() => this.hasPermission = false)
                return false;
            } else {
                console.log('Permission granted to receive push notifications')
                runInAction(() => this.hasPermission = true)
                return true;
            }
        } catch (e) {
            console.log('Error requesting permission to receive push notifications: ', e);
            runInAction(() => this.hasPermission = false)
            return false;
        }
    }

    async updatePushToken() {
        // don't keep copy on device
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        await API.reportPushToken(token);
    }

    onNotification<T extends NotificationType>(type: T, cb: (data: NotificationPayload<T>, notification: Notification) => void) {
        const callbacks = this.notificationCallbacks.get(type)

        if (callbacks) {
            callbacks.push(cb);
        } else {
            this.notificationCallbacks.set(type, [cb]);
        }
    }
    
    onNotificationResponse<T extends NotificationType>(type: T, cb: (data: NotificationPayload<T>, res: NotificationResponse) => void) {
        const callbacks = this.notificationResponseCallbacks.get(type)

        if (callbacks) {
            callbacks.push(cb);
        } else {
            this.notificationResponseCallbacks.set(type, [cb]);
        }
    }

    // closure so it can be used as a callback and still reference 'this'
    notificationCallback = (notification: Notification) => {
        const data = notification.request.content.data;
        const key = data.type as NotificationType;
        const callbacks = this.notificationCallbacks.get(key)

        if (callbacks && callbacks.length) {
            for (const cb of callbacks) {
                cb(
                    data,
                    notification
                )
            }
        }
    }
    
    // closure so it can be used as a callback and still reference 'this'
    notificationResponseCallback = (res: NotificationResponse) => {
        const data = res.notification.request.content.data;
        const key = data.type as NotificationType;
        const callbacks = this.notificationResponseCallbacks.get(key)

        if (callbacks && callbacks.length) {
            for (const cb of callbacks) {
                cb(
                    data,
                    res
                )
            }
        }
    }

    async startListeningForNotifications() {
        if (Constants.isDevice) {
            if (!this.hasPermission) {
                const permissionGranted = await this.askForPermission()
                
                if (!permissionGranted) {
                    return;
                }                
            }

            this.notificationsSub = Notifications.addNotificationReceivedListener(this.notificationCallback);
            this.notificationResponseSub = Notifications.addNotificationResponseReceivedListener(this.notificationResponseCallback);

            // TODO: shouldn't have to do this every time?...or do we?
            await this.updatePushToken();

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