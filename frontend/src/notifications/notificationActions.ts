import { NoisyNotificationEventType, NotificationEventType, PatchEventPacket, PatchEventType, SilentNotificationEventType } from "../../../common/models";
import { Notification, NotificationAction } from 'expo-notifications';
import { RootStackParamList, routerNames } from "../types";
import { navigationStore, requestStore, updateStore, userStore } from "../stores/interfaces";
import { api } from "../services/interfaces";

export interface NotificationHandlerDefinition<T extends PatchEventType = PatchEventType> {
    actions: () => NotificationResponseDefinition<T>[];
    onNotificationRecieved: (payload: PatchEventPacket<T>) => Promise<void>;

    dontForwardUpdates: boolean
    dontShowNotification: boolean
    /**
     * NOTE: any stores used in this function need to be init()'d in the NotificationStore
     */
    defaultRouteTo: (packet: PatchEventPacket<T>) => keyof RootStackParamList
}

export abstract class NotificationHandler<T extends NoisyNotificationEventType> implements NotificationHandlerDefinition<T> {
    actions: () => NotificationResponseDefinition<T>[] = null
    onNotificationRecieved: (payload: PatchEventPacket<T>) => Promise<void> = null

    dontForwardUpdates = false
    dontShowNotification = false
    defaultRouteTo(packet: PatchEventPacket<T>): keyof RootStackParamList { 
        return null
    }
}

export abstract class SilentNotificationHandlerDefinition<T extends SilentNotificationEventType> implements NotificationHandlerDefinition<T> {
    actions: () => NotificationResponseDefinition<T>[] = null
    onNotificationRecieved: (payload: PatchEventPacket<T>) => Promise<void> = null

    dontForwardUpdates = false
    dontShowNotification = true
    defaultRouteTo = () => null
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

export class OrganizationEditedHandler extends SilentNotificationHandlerDefinition<PatchEventType.OrganizationEdited> {

}

export class OrganizationTagsUpdatedHandler extends SilentNotificationHandlerDefinition<PatchEventType.OrganizationTagsUpdated> {

}

export class OrganizationAttributesUpdatedHandler extends SilentNotificationHandlerDefinition<PatchEventType.OrganizationAttributesUpdated> {

}

export class OrganizationRoleCreatedHandler extends SilentNotificationHandlerDefinition<PatchEventType.OrganizationRoleCreated> {

}

export class OrganizationRoleEditedHandler extends SilentNotificationHandlerDefinition<PatchEventType.OrganizationRoleEdited> {

}

export class OrganizationRoleDeletedHandler extends SilentNotificationHandlerDefinition<PatchEventType.OrganizationRoleDeleted> {

}

////////////////////////////////////////////////////////////
// Show notification with no actions but route to a view  //
// when user interacts with it                            //
////////////////////////////////////////////////////////////

export class RequestDetailsNotificationHandler<T extends NoisyNotificationEventType> extends NotificationHandler<T> {
    defaultRouteTo(packet: PatchEventPacket<T>): keyof RootStackParamList {
        return navigationStore().currentRoute == routerNames.helpRequestDetails && packet.params.requestId == requestStore().currentRequestId
            ? null
            : routerNames.helpRequestDetails
    }
}

// TODO: make sure help request details handles being routed to from all of these
export class RequestChatNewMessageHandler extends RequestDetailsNotificationHandler<PatchEventType.RequestChatNewMessage> {

}

export class RequestRespondersNotifiedHandler extends RequestDetailsNotificationHandler<PatchEventType.RequestRespondersNotified> {

}

export class RequestRespondersJoinedHandler extends RequestDetailsNotificationHandler<PatchEventType.RequestRespondersJoined> {

}

export class RequestRespondersLeftHandler extends RequestDetailsNotificationHandler<PatchEventType.RequestRespondersLeft> {

}

export class RequestRespondersAcceptedHandler extends RequestDetailsNotificationHandler<PatchEventType.RequestRespondersAccepted> {

}

export class RequestRespondersDeclinedHandler extends RequestDetailsNotificationHandler<PatchEventType.RequestRespondersDeclined> {

}

export class RequestRespondersRemovedHandler extends RequestDetailsNotificationHandler<PatchEventType.RequestRespondersRemoved> {

}


////////////////////////////////////////////////////////////
// Show notification with actions and a defeult route to  //
// a view when user interacts with it                     //
////////////////////////////////////////////////////////////

export class RequestRespondersRequestToJoinHandler extends RequestDetailsNotificationHandler<PatchEventType.RequestRespondersRequestToJoin> {

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
    [PatchEventType.OrganizationEdited]: new OrganizationEditedHandler(),
    [PatchEventType.OrganizationTagsUpdated]: new OrganizationTagsUpdatedHandler(),
    [PatchEventType.OrganizationAttributesUpdated]: new OrganizationAttributesUpdatedHandler(),
    [PatchEventType.OrganizationRoleCreated]: new OrganizationRoleCreatedHandler(),
    [PatchEventType.OrganizationRoleEdited]: new OrganizationRoleEditedHandler(),
    [PatchEventType.OrganizationRoleDeleted]: new OrganizationRoleDeletedHandler(),
}