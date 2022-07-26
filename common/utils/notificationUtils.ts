import { AnyFunction, NotificationEventType, PatchEventType } from '../models'


export function notificationLabel<T extends NotificationEventType, F extends AnyFunction = typeof NotificationLabelMap[T]>(event: T, ...args: Parameters<F>): string {
    const labelFunc = NotificationLabelMap[event] as F;
    return labelFunc(...args)
}

const NotificationLabelMap = {
    // Silent
    [PatchEventType.UserForceLogout]: () => '',
    [PatchEventType.RequestRespondersNotificationAck]: () => '', 
    [PatchEventType.UserEdited]: () => '',
    [PatchEventType.UserOnDuty]: () => '',
    [PatchEventType.UserOffDuty]: () => '',
    [PatchEventType.UserChangedRolesInOrg]: () => '',
    [PatchEventType.UserAddedToOrg]: () => '',
    [PatchEventType.RequestCreated]: () => '',
    [PatchEventType.RequestEdited]: () => '',
    [PatchEventType.OrganizationEdited]: () => '',
    [PatchEventType.OrganizationTagsUpdated]: () => '',
    [PatchEventType.OrganizationAttributesUpdated]: () => '',
    [PatchEventType.OrganizationRoleCreated]: () => '',
    [PatchEventType.OrganizationRoleEdited]: () => '',
    [PatchEventType.OrganizationRoleDeleted]: () => '',

    // Noisy
    [PatchEventType.RequestChatNewMessage]: (requestName: string, senderName: string) => {
        return `Request ${requestName} has a new message from ${senderName}`
    },
    [PatchEventType.RequestRespondersNotified]: (requestName: string) => {
        return `Help needed on request ${requestName}`
    },
    [PatchEventType.RequestRespondersJoined]: (requestName: string, responderName: string) => {
        return `${responderName} has joined request ${requestName}`
    }, 
    [PatchEventType.RequestRespondersLeft]: (requestName: string, responderName: string) => {
        return `${responderName} has left request ${requestName}`
    }, 
    [PatchEventType.RequestRespondersAccepted]: (requestName: string, approverName: string) => {
        return `${approverName} has approved your request to join ${requestName}`
    }, 
    [PatchEventType.RequestRespondersDeclined]: (requestName: string, declinerName: string) => {
        return `${declinerName} has declined your request to join ${requestName}`
    }, 
    [PatchEventType.RequestRespondersRemoved]: (requestName: string, removerName: string) => {
        return `${removerName} has removed you from ${requestName}`
    }, 
    [PatchEventType.RequestRespondersRequestToJoin]: (requestName: string, requesterName: string, positionName: string) => {
        return `${requesterName} has requested to join ${requestName} on the '${positionName}' position`
    }, 
}