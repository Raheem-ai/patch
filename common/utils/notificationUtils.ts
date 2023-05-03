import { AnyFunction, NotificationEventType, PatchEventType } from '../models';
import STRINGS from '../strings';


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
    [PatchEventType.SystemDynamicConfigUpdated]: () => '',

    // Noisy
    [PatchEventType.RequestChatNewMessage]: (requestName: string, senderName: string, prefix?: string) => {
        return `New message on ${STRINGS.REQUESTS.requestDisplayName(prefix, requestName)} from ${senderName}`
    },
    [PatchEventType.RequestRespondersNotified]: (requestName: string, notifierName: string, prefix?: string, hasPositions?: boolean ) => {
        return (hasPositions
            ? `Responders needed for ${STRINGS.REQUESTS.requestDisplayName(prefix, requestName)}`
            : `${notifierName} notified you about ${STRINGS.REQUESTS.requestDisplayName(prefix, requestName)}`
    )},
    [PatchEventType.RequestRespondersJoined]: (requestName: string, responderName: string, prefix: string) => {
        return `${responderName} joined ${STRINGS.REQUESTS.requestDisplayName(prefix, requestName)}`
    }, 
    [PatchEventType.RequestRespondersLeft]: (requestName: string, responderName: string, prefix: string) => {
        return `${responderName} left ${STRINGS.REQUESTS.requestDisplayName(prefix, requestName)}`
    }, 
    [PatchEventType.RequestRespondersAccepted]: (requestName: string, approverName: string, prefix?: string) => {
        return `${approverName} approved you for ${STRINGS.REQUESTS.requestDisplayName(prefix, requestName)}`
    }, 
    [PatchEventType.RequestRespondersDeclined]: (requestName: string, declinerName: string, prefix?: string) => {
        return `${declinerName} declined you for ${STRINGS.REQUESTS.requestDisplayName(prefix, requestName)}`
    }, 
    [PatchEventType.RequestRespondersRemoved]: (requestName: string, removerName: string, prefix?: string) => {
        return `${removerName} removed you from ${STRINGS.REQUESTS.requestDisplayName(prefix, requestName)}`
    }, 
    [PatchEventType.RequestRespondersRequestToJoin]: (requestName: string, requesterName: string, prefix?: string) => {
        return `${requesterName} requested to join ${STRINGS.REQUESTS.requestDisplayName(prefix, requestName)}`
    }, 
}