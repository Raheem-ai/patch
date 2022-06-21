import { CategorizedItem, DefaultRoleIds, HelpRequest, PatchEventType, Position, ProtectedUser, RequestStatus, RequestTeamEvent, RequestTeamEventTypes, Role } from "../models";

export function resolveRequestStatus(request: HelpRequest): RequestStatus {
    const shouldAutoUpdate = request.status == RequestStatus.Unassigned 
        || request.status == RequestStatus.PartiallyAssigned
        || request.status == RequestStatus.Ready;

    if (shouldAutoUpdate) {
        return assignedResponderBasedRequestStatus(request);
    } else {
        return request.status;
    }
}

export function assignedResponderBasedRequestStatus(request: HelpRequest): RequestStatus {
    const stats = positionStats(request.positions);
    
    return !stats.totalMinFilled 
        ? RequestStatus.Unassigned
        : stats.totalMinToFill > stats.totalMinFilled 
            ? RequestStatus.PartiallyAssigned
            : RequestStatus.Ready;
}

export function getPreviousOpenStatus(request: HelpRequest): RequestStatus {
    const statusEvents = request.statusEvents.slice().reverse();
    for (const event of statusEvents) {
        if (event.status != RequestStatus.Closed) {
            return event.status;
        }
    }

    return RequestStatus.Unassigned;
}

type AggregatePositionStats = {
    totalMinFilled: number,
    totalMinToFill: number,
    totalFilled: number
}

export function positionStats(positions: Position[]): AggregatePositionStats {
    let totalMinFilled = 0;
    let totalMinToFill = 0;
    let totalFilled = 0;

    for (const position of positions) {
        totalMinToFill += position.min
        totalMinFilled += Math.min(position.joinedUsers.length, position.min)
        totalFilled += position.joinedUsers.length
    }

    return {
        totalMinFilled,
        totalMinToFill,
        totalFilled
    }
}

export function userCurrentlyKickedFromRequestPosition(teamEvents: RequestTeamEvent[], positionId: string, userId: string) {
    let kicked = false;

    teamEvents.forEach(event => {
        // TODO: type gaurds to make this more ergo
        if (event.type == PatchEventType.RequestRespondersRemoved) {
            const e = event as RequestTeamEvent<PatchEventType.RequestRespondersRemoved>;
            
            if (e.user == userId && e.position == positionId) {
                kicked = true
            }
        } else if (kicked && event.type == PatchEventType.RequestRespondersAccepted) {
            const e = event as RequestTeamEvent<PatchEventType.RequestRespondersAccepted>;
            
            if (e.position == positionId) {
                kicked = false
            }
        }
    })

    return kicked
}

export function userCanJoinRequestPosition(
    request: HelpRequest, 
    positionId: string,
    user: ProtectedUser,
    orgId: string
) {
    // const userAttributes = user.organizations[orgId]?.attributes;
    // const userRoles = user.organizations[orgId]?.roles;
    const pos = request.positions.find(p => p.id == positionId);

    if (!pos) {
        return false;
    }

    const qualified = userQualifiedForPosition(pos, user, orgId);
    const currentlyKicked = userCurrentlyKickedFromRequestPosition(request.teamEvents, pos.id, user.id)

    return qualified && !currentlyKicked;
}

export function userQualifiedForPosition(
    pos: Position, 
    user: ProtectedUser,
    orgId: string
) {
    const haveAllAttributes = pos.attributes.every(attr => !!user.organizations[orgId]?.attributes.find(userAttr => userAttr.categoryId == attr.categoryId && userAttr.itemId == attr.itemId));
    const haveRole = pos.role == DefaultRoleIds.Anyone
        || user.organizations[orgId]?.roleIds.find(roleId => roleId == pos.role)

    return haveAllAttributes && haveRole;
}