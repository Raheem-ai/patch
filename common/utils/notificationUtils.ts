import { AnyFunction, NotificationEventType, PatchEventType } from '../models'


export function notificationLabel<T extends NotificationEventType, F extends AnyFunction = typeof NotificationLabelMap[T]>(event: T, ...args: Parameters<F>): string {
    const labelFunc = NotificationLabelMap[event] as F;
    return labelFunc(...args)
}

function showPrefix(prefix) {
    return (prefix + '–') || 'Request';
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
    [PatchEventType.RequestChatNewMessage]: (requestName: string, senderName: string, prefix?: string) => {
        return `New message on ${showPrefix(prefix)}${requestName} from ${senderName}`
    },
    [PatchEventType.RequestRespondersNotified]: (requestName: string, prefix?: string) => {
        return `New Request created: ${showPrefix(prefix)}${requestName}`
    },
    [PatchEventType.RequestRespondersJoined]: (requestName: string, responderName: string, prefix: string) => {
        return `${responderName} joined ${showPrefix(prefix)}${requestName}`
    }, 
    [PatchEventType.RequestRespondersLeft]: (requestName: string, responderName: string, prefix: string) => {
        return `${responderName} left ${showPrefix(prefix)}${requestName}`
    }, 
    [PatchEventType.RequestRespondersAccepted]: (requestName: string, approverName: string, prefix?: string) => {
        return `${approverName} approved you for ${showPrefix(prefix)}${requestName}`
    }, 
    [PatchEventType.RequestRespondersDeclined]: (requestName: string, declinerName: string, prefix?: string) => {
        return `${declinerName} declined you for ${showPrefix(prefix)}${requestName}`
    }, 
    [PatchEventType.RequestRespondersRemoved]: (requestName: string, removerName: string, prefix?: string) => {
        return `${removerName} removed you from ${showPrefix(prefix)}${requestName}`
    }, 
    [PatchEventType.RequestRespondersRequestToJoin]: (requestName: string, requesterName: string, prefix?: string) => {
        return `${requesterName} requested to join ${showPrefix(prefix)}${requestName}`
    }, 
}