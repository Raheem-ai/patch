import { NoisyNotificationEventType, NotificationEventType, PatchEventPacket, PatchEventType, SilentNotificationEventType } from "../../../common/models";
import { Notification, NotificationAction } from 'expo-notifications';
import { RootStackParamList, routerNames } from "../types";
import { requestStore, updateStore, userStore } from "../stores/interfaces";
import { api } from "../services/interfaces";

export interface NotificationHandlerDefinition<T extends PatchEventType = PatchEventType> {
    actions: () => NotificationResponseDefinition<T>[];
    onNotificationRecieved: (payload: PatchEventPacket<T>) => Promise<void>;

    dontForwardUpdates: boolean
    dontShowNotification: boolean
    defaultRouteTo: keyof RootStackParamList
}

export abstract class NotificationHandler<T extends NoisyNotificationEventType> implements NotificationHandlerDefinition<T> {
    actions: () => NotificationResponseDefinition<T>[] = null
    onNotificationRecieved: (payload: PatchEventPacket<T>) => Promise<void> = null

    dontForwardUpdates = false
    dontShowNotification = false
    defaultRouteTo: keyof RootStackParamList = null
}

export abstract class SilentNotificationHandlerDefinition<T extends SilentNotificationEventType> implements NotificationHandlerDefinition<T> {
    actions: () => NotificationResponseDefinition<T>[] = null
    onNotificationRecieved: (payload: PatchEventPacket<T>) => Promise<void> = null

    dontForwardUpdates = false
    dontShowNotification = true
    defaultRouteTo: keyof RootStackParamList = null
}

////////////////////////////////////////////////////////////
// Don't show notification but do something when an event //
// comes in through the notification route (so it can be  //
// picked up in the background) or via the websocket      //
////////////////////////////////////////////////////////////

export class ForcedLogoutHandler extends SilentNotificationHandlerDefinition<PatchEventType.UserForceLogout> {
    dontForwardUpdates = true

    onNotificationRecieved = async (payload: PatchEventPacket<PatchEventType.UserForceLogout>) => {
        await api().init()
        await userStore().init()

        if (userStore().user.id == payload.params.userId && api().refreshToken == payload.params.refreshToken) {
            await userStore().signOut()
        }
    }
}

export class RequestRespondersNotificationAckHandler extends SilentNotificationHandlerDefinition<PatchEventType.RequestRespondersNotificationAck> {

}

export class UserEditedHandler extends SilentNotificationHandlerDefinition<PatchEventType.UserEdited> {

}

export class UserOnDutyHandler extends SilentNotificationHandlerDefinition<PatchEventType.UserOnDuty> {

}

export class UserOffDutyHandler extends SilentNotificationHandlerDefinition<PatchEventType.UserOffDuty> {

}

export class UserChangedRolesInOrgHandler extends SilentNotificationHandlerDefinition<PatchEventType.UserChangedRolesInOrg> {

}

export class UserAddedToOrgHandler extends SilentNotificationHandlerDefinition<PatchEventType.UserAddedToOrg> {

}

export class RequestCreatedHandler extends SilentNotificationHandlerDefinition<PatchEventType.RequestCreated> {

}

export class RequestEditedHandler extends SilentNotificationHandlerDefinition<PatchEventType.RequestEdited> {

}

////////////////////////////////////////////////////////////
// Show notification with no actions but route to a view  //
// when user interacts with it                            //
////////////////////////////////////////////////////////////

// TODO: make sure help request details handles being routed to from all of these
export class RequestChatNewMessageHandler extends NotificationHandler<PatchEventType.RequestChatNewMessage> {
    defaultRouteTo = routerNames.helpRequestDetails
}

export class RequestRespondersNotifiedHandler extends NotificationHandler<PatchEventType.RequestRespondersNotified> {
    defaultRouteTo = routerNames.helpRequestDetails
}

export class RequestRespondersJoinedHandler extends NotificationHandler<PatchEventType.RequestRespondersJoined> {
    defaultRouteTo = routerNames.helpRequestDetails
}

export class RequestRespondersLeftHandler extends NotificationHandler<PatchEventType.RequestRespondersLeft> {
    defaultRouteTo = routerNames.helpRequestDetails
}

export class RequestRespondersAcceptedHandler extends NotificationHandler<PatchEventType.RequestRespondersAccepted> {
    defaultRouteTo = routerNames.helpRequestDetails
}

export class RequestRespondersDeclinedHandler extends NotificationHandler<PatchEventType.RequestRespondersDeclined> {
    defaultRouteTo = routerNames.helpRequestDetails
}

export class RequestRespondersRemovedHandler extends NotificationHandler<PatchEventType.RequestRespondersRemoved> {
    defaultRouteTo = routerNames.helpRequestDetails
}


////////////////////////////////////////////////////////////
// Show notification with actions and a defeult route to  //
// a view when user interacts with it                     //
////////////////////////////////////////////////////////////

export class RequestRespondersRequestToJoinHandler extends NotificationHandler<PatchEventType.RequestRespondersRequestToJoin> {
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
                                payload.params.responderId,
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
                                payload.params.responderId,
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

export const NotificationHandlers: { [type in NotificationEventType]: NotificationHandlerDefinition<type> } = {
    [PatchEventType.UserForceLogout]: new ForcedLogoutHandler(),
    [PatchEventType.RequestRespondersNotified]: new RequestRespondersNotifiedHandler(),
    [PatchEventType.RequestRespondersNotificationAck]: new RequestRespondersNotificationAckHandler(), 
    [PatchEventType.RequestRespondersJoined]: new RequestRespondersJoinedHandler(), 
    [PatchEventType.RequestRespondersLeft]: new RequestRespondersLeftHandler(), 
    [PatchEventType.RequestRespondersAccepted]: new RequestRespondersAcceptedHandler(), 
    [PatchEventType.RequestRespondersDeclined]: new RequestRespondersDeclinedHandler(), 
    [PatchEventType.RequestRespondersRemoved]: new RequestRespondersRemovedHandler(), 
    [PatchEventType.RequestRespondersRequestToJoin]: new RequestRespondersRequestToJoinHandler(), 
    [PatchEventType.RequestChatNewMessage]: new RequestChatNewMessageHandler(),
    [PatchEventType.UserEdited]: new UserEditedHandler(),
    [PatchEventType.UserOnDuty]: new UserOnDutyHandler(),    
    [PatchEventType.UserOffDuty]: new UserOffDutyHandler(),    
    [PatchEventType.UserChangedRolesInOrg]: new UserChangedRolesInOrgHandler(),    
    [PatchEventType.UserAddedToOrg]: new UserAddedToOrgHandler(),    
    [PatchEventType.RequestCreated]: new RequestCreatedHandler(),    
    [PatchEventType.RequestEdited]: new RequestEditedHandler(),    
    
}