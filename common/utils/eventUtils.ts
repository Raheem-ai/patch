import { OrgEventType, PatchEventPacket, PatchEventType, IndividualRequestEventType, BulkRequestEventType, BulkUserEventType, IndividualUserEventType } from '../models'

export function isIndividualRequestEventPacket(packet: PatchEventPacket): packet is PatchEventPacket<IndividualRequestEventType> {
    return packet.event == PatchEventType.RequestChatNewMessage
        || packet.event == PatchEventType.RequestCreated
        || packet.event == PatchEventType.RequestDeleted
        || packet.event == PatchEventType.RequestEdited
        || packet.event == PatchEventType.RequestRespondersAccepted
        || packet.event == PatchEventType.RequestRespondersDeclined
        || packet.event == PatchEventType.RequestRespondersJoined
        || packet.event == PatchEventType.RequestRespondersLeft
        || packet.event == PatchEventType.RequestRespondersNotificationAck
        || packet.event == PatchEventType.RequestRespondersNotified
        || packet.event == PatchEventType.RequestRespondersRemoved
        || packet.event == PatchEventType.RequestRespondersRequestToJoin
        || packet.event == PatchEventType.RequestRespondersRequestToJoinAck
}

export function isUserEventPacket(packet: PatchEventPacket): packet is PatchEventPacket<IndividualUserEventType> {
    return packet.event == PatchEventType.UserCreated
    || packet.event == PatchEventType.UserEdited
    || packet.event == PatchEventType.UserDeleted
    || packet.event == PatchEventType.UserAddedToOrg
    || packet.event == PatchEventType.UserRemovedFromOrg
    || packet.event == PatchEventType.UserChangedRolesInOrg
    || packet.event == PatchEventType.UserOnDuty
    || packet.event == PatchEventType.UserOffDuty
}

export function isBulkRequestEventPacket(packet: PatchEventPacket): packet is PatchEventPacket<BulkRequestEventType> {
    return packet.event == PatchEventType.OrganizationRoleDeleted
    || packet.event == PatchEventType.OrganizationAttributesUpdated
    || packet.event == PatchEventType.OrganizationTagsUpdated
}

export function isBulkUserEventPacket(packet: PatchEventPacket): packet is PatchEventPacket<BulkUserEventType> {
    return packet.event == PatchEventType.OrganizationRoleDeleted
    || packet.event == PatchEventType.OrganizationAttributesUpdated
}

export function isOrgEventPacket(packet: PatchEventPacket): packet is PatchEventPacket<OrgEventType> {
    return packet.event == PatchEventType.OrganizationEdited
    || packet.event == PatchEventType.OrganizationDeleted
    || packet.event == PatchEventType.OrganizationRoleCreated
    || packet.event == PatchEventType.OrganizationRoleEdited
    || packet.event == PatchEventType.OrganizationRoleDeleted
    || packet.event == PatchEventType.OrganizationAttributesUpdated
    || packet.event == PatchEventType.OrganizationTagsUpdated
}