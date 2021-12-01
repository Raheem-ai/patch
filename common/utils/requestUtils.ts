import { HelpRequest, RequestStatus } from "../models";

export function assignedResponderBasedRequestStatus(request: HelpRequest): RequestStatus {
    return !request.assignedResponderIds.length 
        ? RequestStatus.Unassigned
        : request.respondersNeeded > request.assignedResponderIds.length
            ? RequestStatus.PartiallyAssigned
            : RequestStatus.Ready;
}