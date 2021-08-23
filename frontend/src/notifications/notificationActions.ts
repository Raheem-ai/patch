import { NotificationPayload, NotificationType } from "../../../common/models";
import { NotificationAction } from 'expo-notifications';
import { RootStackParamList, routerNames } from "../types";
import api from "../api";

export interface NotificationResponseDefinition<T extends NotificationType = any> extends NotificationAction {
    options: {
        isDestructive: boolean,
        isAuthenticationRequired: boolean,
        opensAppToForeground: true,
        // TODO: figure out a way to bind this type so you can't route to a screen
        // who's params arent updated to expect the notification type
        routeTo: keyof RootStackParamList
    } | {
        isDestructive: boolean,
        isAuthenticationRequired: boolean,
        opensAppToForeground: false,
        handler: (payload: NotificationPayload<T>) => Promise<void>
    }
}

// TODO: make this class based so it's not so clunky trying to add new notification types + their responses
export const interactiveNotifications: { [type in NotificationType]?: NotificationResponseDefinition<type>[] } = {
    [NotificationType.AssignedIncident]: [
        {
            identifier: 'AcceptIncident',
            buttonTitle: 'Confirm',
            options: {
                isDestructive: false,
                isAuthenticationRequired: false,
                opensAppToForeground: false,
                handler: async (payload) => {
                    try {
                        await api.confirmIncidentAssignment();
                    } catch (e) {
                        console.error(e);
                    }
                }
            },
        },
        {
            identifier: 'DeclineIncident',
            buttonTitle: 'Decline',
            options: {
                isDestructive: true,
                isAuthenticationRequired: false,
                opensAppToForeground: false,
                handler: async (payload) => {
                    try {
                        await api.declineIncidentAssignment();
                    } catch (e) {
                        console.error(e);
                    }
                }
            },
        },
        {
            identifier: 'ViewIncident',
            buttonTitle: 'View Incident',
            options: {
                isDestructive: false,
                isAuthenticationRequired: true,
                opensAppToForeground: true,
                routeTo: routerNames.incidentDetails 
            }
        }
    ]
}