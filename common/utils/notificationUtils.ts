import { AnyFunction, NotificationEventType, PatchEventType } from '../models'


export function notificationLabel<T extends NotificationEventType, F extends AnyFunction = typeof NotificationLabelMap[T]>(event: T, ...args: Parameters<F>): string {
    const labelFunc = NotificationLabelMap[event] as F;
    return labelFunc(...args)
}

const NotificationLabelMap = {
    // Silent
    [PatchEventType.UserForceLogout]: () => '',
    [PatchEventType.RequestRespondersNotified]: (requestName: string) => `Help needed on request ${requestName}`,
    [PatchEventType.RequestRespondersNotificationAck]: () => '', 

    // Noisy
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