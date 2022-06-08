import { NotificationType, PatchEventPacket, PatchEventType } from "../../../common/models";
import { Notification, NotificationAction } from 'expo-notifications';
import { RootStackParamList, routerNames } from "../types";
import { requestStore, updateStore, userStore } from "../stores/interfaces";
import { api } from "../services/interfaces";

export abstract class NotificationHandlerDefinition<T extends PatchEventType = PatchEventType> {
    actions: () => NotificationResponseDefinition<T>[] = null
    onNotificationRecieved: (payload: PatchEventPacket<T>) => Promise<void> = null

    dontForwardUpdates = false
    dontShowNotification = false
    defaultRouteTo: keyof RootStackParamList = null
}

////////////////////////////////////////////////////////////
// Don't show notification but do something when an event //
// comes in through the notification route (so it can be  //
// picked up in the background)                           //
////////////////////////////////////////////////////////////

export class ForcedLogoutHandler extends NotificationHandlerDefinition<PatchEventType.UserForceLogout> {
    dontShowNotification = true
    dontForwardUpdates = true

    onNotificationRecieved = async (payload: PatchEventPacket<PatchEventType.UserForceLogout>) => {
        await api().init()
        await userStore().init()

        if (userStore().user.id == payload.params.userId && api().refreshToken == payload.params.refreshToken) {
            await userStore().signOut()
        }
    }
}

export class RequestRespondersNotifiedHandler extends NotificationHandlerDefinition<PatchEventType.RequestRespondersNotified> {
    dontShowNotification = true
}

export class RequestRespondersNotificationAckHandler extends NotificationHandlerDefinition<PatchEventType.RequestRespondersNotificationAck> {
    dontShowNotification = true
}

////////////////////////////////////////////////////////////
// Show notification with no actions but route to a view  //
// when user interacts with it                            //
////////////////////////////////////////////////////////////

export class RequestRespondersJoinedHandler extends NotificationHandlerDefinition<PatchEventType.RequestRespondersJoined> {
    defaultRouteTo = routerNames.helpRequestDetails
}

export class RequestRespondersLeftHandler extends NotificationHandlerDefinition<PatchEventType.RequestRespondersLeft> {
    defaultRouteTo = routerNames.helpRequestDetails
}

export class RequestRespondersAcceptedHandler extends NotificationHandlerDefinition<PatchEventType.RequestRespondersAccepted> {
    defaultRouteTo = routerNames.helpRequestDetails
}

export class RequestRespondersDeclinedHandler extends NotificationHandlerDefinition<PatchEventType.RequestRespondersDeclined> {
    defaultRouteTo = routerNames.helpRequestDetails
}

export class RequestRespondersRemovedHandler extends NotificationHandlerDefinition<PatchEventType.RequestRespondersRemoved> {
    defaultRouteTo = routerNames.helpRequestDetails
}

////////////////////////////////////////////////////////////
// Show notification with actions and a defeult route to  //
// a view when user interacts with it                     //
////////////////////////////////////////////////////////////

export class RequestRespondersRequestToJoinHandler extends NotificationHandlerDefinition<PatchEventType.RequestRespondersRequestToJoin> {
    defaultRouteTo = routerNames.helpRequestDetails

    actions = (): NotificationResponseDefinition<PatchEventType.RequestRespondersRequestToJoin>[] => {
        return [
            {
                identifier: 'ApproveJoinRequest',
                buttonTitle: 'Approve',
                options: {
                    isDestructive: false,
                    isAuthenticationRequired: false,
                    opensAppToForeground: false,
                    handler: async (payload) => {
                        try {
                            await requestStore().init()

                            await requestStore().approveRequestToJoinRequest(
                                payload.params.userId,
                                payload.params.requestId,
                                payload.params.positionId,
                            )
                        } catch (e) {
                            console.error(e);
                        }
                    }
                },
            },
            {
                identifier: 'DenyJoinRequest',
                buttonTitle: 'Deny',
                options: {
                    isDestructive: true,
                    isAuthenticationRequired: false,
                    opensAppToForeground: false,
                    handler: async (payload) => {
                        try {
                            await requestStore().init()

                            await requestStore().denyRequestToJoinRequest(
                                payload.params.userId,
                                payload.params.requestId,
                                payload.params.positionId,
                            )
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

export interface NotificationResponseDefinition<T extends PatchEventType = any> extends NotificationAction {
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
        handler: (payload: PatchEventPacket<T>) => Promise<void>
    }
}

export const NotificationHandlers: { [type in PatchEventType]?: NotificationHandlerDefinition<type> } = {
    [PatchEventType.UserForceLogout]: new ForcedLogoutHandler(),
    [PatchEventType.RequestRespondersNotificationAck]: new RequestRespondersNotificationAckHandler(), 
    [PatchEventType.RequestRespondersJoined]: new RequestRespondersJoinedHandler(), 
    [PatchEventType.RequestRespondersLeft]: new RequestRespondersLeftHandler(), 
    [PatchEventType.RequestRespondersAccepted]: new RequestRespondersAcceptedHandler(), 
    [PatchEventType.RequestRespondersDeclined]: new RequestRespondersDeclinedHandler(), 
    [PatchEventType.RequestRespondersRemoved]: new RequestRespondersRemovedHandler(), 
    [PatchEventType.RequestRespondersRequestToJoin]: new RequestRespondersRequestToJoinHandler(), 
}