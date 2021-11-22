import { NotificationPayload, NotificationType } from "../../../common/models";
import { NotificationAction } from 'expo-notifications';
import { RootStackParamList, routerNames } from "../types";
import { IUserStore } from "../stores/interfaces";
import { getStore } from "../stores/meta";
import { getService } from "../services/meta";
import { IAPIService } from "../services/interfaces";

export class NotificationHandlerDefinition<T extends NotificationType = any> {
    defaultRouteTo?: keyof RootStackParamList

    actions(): NotificationResponseDefinition<T>[] {
        return []
    }

    constructor(private type: T) { }
}

export class AssignedIncidentHandler extends NotificationHandlerDefinition<NotificationType.AssignedIncident> {
    defaultRouteTo = routerNames.helpRequestDetails;
    
    constructor() {
        super(NotificationType.AssignedIncident)
    }

    actions(): NotificationResponseDefinition<NotificationType.AssignedIncident>[] {
        return [
            {
                identifier: 'AcceptIncident',
                buttonTitle: 'Confirm',
                options: {
                    isDestructive: false,
                    isAuthenticationRequired: false,
                    opensAppToForeground: false,
                    handler: async (payload) => {
                        try {
                            const api = getService<IAPIService>(IAPIService);
                            await api.init();

                            const userStore = getStore<IUserStore>(IUserStore);
                            await userStore.init();

                            // need to add orgId to notification payload
                            await api.confirmRequestAssignment({ 
                                token: userStore.authToken, 
                                orgId: payload.orgId
                            }, payload.id);

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
                            const api = getService<IAPIService>(IAPIService);
                            await api.init();
                            
                            const userStore = getStore<IUserStore>(IUserStore);
                            await userStore.init();

                            await api.declineRequestAssignment({ 
                                token: userStore.authToken, 
                                orgId: payload.orgId
                            }, payload.id);
                            
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
                    routeTo: routerNames.helpRequestDetails 
                }
            }
        ]
    }
}

export class BroadCastedIncidentHandler extends NotificationHandlerDefinition<NotificationType.BroadCastedIncident> {
    defaultRouteTo = routerNames.helpRequestDetails;
    
    constructor() {
        super(NotificationType.BroadCastedIncident)
    }
}

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

export const NotificationHandlers: { [type in NotificationType]: NotificationHandlerDefinition<type> } = {
    [NotificationType.AssignedIncident]: new AssignedIncidentHandler(),
    [NotificationType.BroadCastedIncident]: new BroadCastedIncidentHandler()
}