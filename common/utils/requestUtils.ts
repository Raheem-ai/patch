import { CategorizedItem, DefaultRoleIds, HelpRequest, Organization, PatchEventType, Position, ProtectedUser, RequestStatus, RequestTeamEvent, RequestTeamEventTypes, Role } from "../models";
import STRINGS from "../strings";

export function resolveRequestStatus(request: Pick<HelpRequest, 'status' | 'positions'>, usersRemovedFromOrg: string[]): RequestStatus {
    const shouldAutoUpdate = request.status == RequestStatus.Unassigned 
        || request.status == RequestStatus.PartiallyAssigned
        || request.status == RequestStatus.Ready;

    if (shouldAutoUpdate) {
        return assignedResponderBasedRequestStatus(request, usersRemovedFromOrg);
    } else {
        return request.status;
    }
}

export function assignedResponderBasedRequestStatus(request: Pick<HelpRequest, 'positions'>, usersRemovedFromOrg: string[]): RequestStatus {
    const stats = positionStats(request.positions, usersRemovedFromOrg);
    
    return !stats.totalMinFilled 
        ? RequestStatus.Unassigned
        : stats.totalMinToFill > stats.totalMinFilled 
            ? RequestStatus.PartiallyAssigned
            : RequestStatus.Ready;
}

export function getPreviousOpenStatus(request: Pick<HelpRequest, 'statusEvents'>): RequestStatus {
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

export function positionStats(positions: Position[], usersRemovedFromOrg?: string[]): AggregatePositionStats {
    let totalMinFilled = 0;
    let totalMinToFill = 0;
    let totalFilled = 0;

    for (const position of positions) {
        const joinedUsersInOrg = usersRemovedFromOrg && usersRemovedFromOrg.length
            ? position.joinedUsers.filter(userId => {
                return !usersRemovedFromOrg.includes(userId)
            })
            : position.joinedUsers;

        totalMinToFill += position.min
        totalMinFilled += Math.min(joinedUsersInOrg.length, position.min)
        totalFilled += joinedUsersInOrg.length
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
    request: Pick<HelpRequest, 'positions' | 'teamEvents'>, 
    positionId: string,
    user: ProtectedUser,
    org: Pick<Organization, 'attributeCategories' | 'id'>
) {
    // const userAttributes = user.organizations[orgId]?.attributes;
    // const userRoles = user.organizations[orgId]?.roles;
    const pos = request.positions.find(p => p.id == positionId);

    if (!pos) {
        return false;
    }

    const qualified = userQualifiedForPosition(pos, user, org);
    const currentlyKicked = userCurrentlyKickedFromRequestPosition(request.teamEvents, pos.id, user.id)

    return qualified && !currentlyKicked;
}

export function userQualifiedForPosition(
    pos: Position, 
    user: ProtectedUser,
    org: Pick<Organization, 'attributeCategories' | 'id'>
) {
    // TODO: this could be more efficient by building sets if it ever comes to that
    const haveAllAttributes = pos.attributes.every(attr => {
        const isValidAttr = !!org.attributeCategories.find(cat => {
            return cat.id == attr.categoryId && !!cat.attributes.find(catAttr => catAttr.id == attr.itemId)
        })

        return !isValidAttr || !!user.organizations[org.id]?.attributes.find(userAttr => userAttr.categoryId == attr.categoryId && userAttr.itemId == attr.itemId)
    });
    
    const haveRole = pos.role == DefaultRoleIds.Anyone
        || user.organizations[org.id]?.roleIds.find(roleId => roleId == pos.role)

    return haveAllAttributes && haveRole;
}

// Can be optimized in the future by putting this on the req object 
// and just updating it whenever we update the team events on the backend
// so the ui can just use the latest set associated to this version of the
// req
export function usersAssociatedWithRequest(req: Pick<HelpRequest, 'dispatcherId' | 'teamEvents' | 'chat'>) {
    const users = new Set<string>();

    // add dispatcher id
    users.add(req.dispatcherId);

    // add ids of users who
    // 1) were sent a notification 
    // 2) joined a position
    // 3) requested to join a position
    // 4) saw/approved/denied a request to join a position
    // 5) removed a user from a position
    req.teamEvents.forEach(event => {
        const e = event as RequestTeamEvent<PatchEventType.RequestRespondersNotified>;

        if (event.type == PatchEventType.RequestRespondersNotified) {
            const e = event as RequestTeamEvent<PatchEventType.RequestRespondersNotified>;

            users.add(e.by);
            e.to.forEach(userId =>  users.add(userId))
        } else if (event.type == PatchEventType.RequestRespondersJoined) {
            const e = event as RequestTeamEvent<PatchEventType.RequestRespondersJoined>;

            users.add(e.user)
        } else if (event.type == PatchEventType.RequestRespondersRequestToJoin) {
            const e = event as RequestTeamEvent<PatchEventType.RequestRespondersRequestToJoin>;

            users.add(e.requester)
        } else if (event.type == PatchEventType.RequestRespondersRequestToJoinAck) {
            const e = event as RequestTeamEvent<PatchEventType.RequestRespondersRequestToJoinAck>;

            users.add(e.by)
        } else if (event.type == PatchEventType.RequestRespondersAccepted) {
            const e = event as RequestTeamEvent<PatchEventType.RequestRespondersAccepted>;

            users.add(e.by)
        } else if (event.type == PatchEventType.RequestRespondersDeclined) {
            const e = event as RequestTeamEvent<PatchEventType.RequestRespondersDeclined>;

            users.add(e.by)
        } else if (event.type == PatchEventType.RequestRespondersRemoved) {
            const e = event as RequestTeamEvent<PatchEventType.RequestRespondersRemoved>;
            users.add(e.by)
        }
    })

    // add users that have sent a chat message
    req.chat?.messages?.forEach(msg => {
        users.add(msg.userId)
    })

    return Array.from(users.values())
}

export function userOnRequest(userId: string, req: Pick<HelpRequest, 'positions'>) {
    return req.positions.some(pos => pos.joinedUsers.includes(userId))
}

export function requestDisplayName(prefix, requestId) {
    return !!(prefix && requestId)
        ? prefix + '–' + requestId
        : STRINGS.cap(STRINGS.ELEMENTS.request());
}