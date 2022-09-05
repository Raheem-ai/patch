import { AnyFunction, NotificationEventType, PatchEventType } from '../models'
import { organizationStore } from "../../frontend/src/stores/interfaces"


export function notificationLabel<T extends NotificationEventType, F extends AnyFunction = typeof NotificationLabelMap[T]>(event: T, ...args: Parameters<F>): string {
    const labelFunc = NotificationLabelMap[event] as F;
    return labelFunc(...args)
}

const prefix = () => {
    return organizationStore().metadata.requestPrefix;
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
        return `${prefix()}–${requestName} has a new message from ${senderName}`
    },
    [PatchEventType.RequestRespondersNotified]: (requestName: string) => {
        return `Help needed on ${prefix()}–${requestName}`
    },
    [PatchEventType.RequestRespondersJoined]: (requestName: string, responderName: string) => {
        return `${responderName} joined ${prefix()}–${requestName}`
    }, 
    [PatchEventType.RequestRespondersLeft]: (requestName: string, responderName: string) => {
        return `${responderName} left ${prefix()}–${requestName}`
    }, 
    [PatchEventType.RequestRespondersAccepted]: (requestName: string, approverName: string) => {
        return `${approverName} approved you for ${prefix()}–${requestName}`
    }, 
    [PatchEventType.RequestRespondersDeclined]: (requestName: string, declinerName: string) => {
        return `${declinerName} declined your request for ${prefix()}–${requestName}`
    }, 
    [PatchEventType.RequestRespondersRemoved]: (requestName: string, removerName: string) => {
        return `${removerName} removed you from ${prefix()}–${requestName}`
    }, 
    [PatchEventType.RequestRespondersRequestToJoin]: (requestName: string, requesterName: string, positionName: string) => {
        return `${requesterName} asked to join ${prefix()}–${requestName} as '${positionName}'`
    }, 
}