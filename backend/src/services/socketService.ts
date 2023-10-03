import { Inject, registerExceptionType } from "@tsed/common";
import { IO, Nsp, Socket, SocketService as Service, SocketSession} from "@tsed/socketio";
import { Organization, PatchEventPacket, PatchEventParams, PatchEventType, PatchNotification, PatchPermissions, UserRole } from "common/models";
import { notificationLabel } from 'common/utils/notificationUtils'
import * as SocketIO from "socket.io";
import { verifyRefreshToken } from "../auth";
import { UserDoc, UserModel } from "../models/user";
import { DBManagerService } from "./dbManagerService";
import Notifications, { NotificationMetadata } from "./notifications";
import { PubSubService } from "./pubSubService";
import { RedisAdapter } from "@socket.io/redis-adapter";
import { OrganizationDoc } from "../models/organization";
import { HelpRequestDoc } from "../models/helpRequest";
import { usersAssociatedWithRequest } from "common/utils/requestUtils";
import { resolvePermissionsFromRoles } from "common/utils/permissionUtils";

type RaheemSocket = SocketIO.Socket<any, any, any, { refreshToken: string }>;
type SendConfig = { 
    userId: string,
    userName: string,
    pushToken: string,
    body: string
}

@Service()
export class MySocketService {

    @Inject(DBManagerService) db: DBManagerService;

    @Nsp nsp: SocketIO.Namespace;
    
    @Inject(Notifications) notifications: Notifications;
    @Inject(PubSubService) pubSub: PubSubService;
    
    constructor(
        @IO private io: SocketIO.Server
    ) {}

    $onNamespaceInit(nsp: SocketIO.Namespace) {
        console.log(`namespace ${nsp.name} initted`)
    }

    get adapter(): RedisAdapter {
        return this.io.of('/').adapter as RedisAdapter
    }

    async $onConnection(@Socket socket: RaheemSocket, @SocketSession session: SocketSession) {
        const refreshToken = socket.handshake?.auth?.token;
        
        if (!refreshToken) {
            socket.disconnect(true);
            return
        } else {
            // verify token and get userId from it
            let user: UserDoc;

            try {
                user = await verifyRefreshToken(refreshToken, this.db);
            } catch (e) {
                socket.disconnect(true)
                return
            }

            // make sure old socket linked to user is removed from room            
            const existingSockets = await this.adapter.fetchSockets({
                rooms: new Set([user.id]),
                except: new Set() // lib has a bug that this fixes
            })

            for (const socket of existingSockets) {
                await this.adapter.remoteLeave(socket.id, user.id)
            }

            // add refresh token metadata and put socket in room <userId> 
            // so we can look it up from any websocket server in the cluster
            socket.data.refreshToken = refreshToken;
            await this.adapter.remoteJoin(socket.id, user.id);

            // set the time this should expire in the context 
            // & check the time when pushing to any socket...force disconnect if the time has past

            console.log(`User: '${user.id}' connected on socket: ${socket.id}`)
        }
    }

    $onDisconnect(@Socket socket: SocketIO.Socket) {
        console.log(`Socket disconnected ${socket.id}`)
    }

    async handleUIUpdateFromSystemEvent<T extends PatchEventType>(event: T, params: PatchEventParams[T]) { 
        switch (event) {
            // case PatchEventType.UserCreated:
            // case PatchEventType.UserDeleted: // TODO: How should we handle this?
            //         // noop
            //     break;
            case PatchEventType.UserForceLogout:
                await this.handleForcedLogout(event, params as PatchEventParams[PatchEventType.UserForceLogout])
                break;
            case PatchEventType.RequestChatNewMessage:
                await this.handleNewRequestChatMessage(params as PatchEventParams[PatchEventType.RequestChatNewMessage])
                break;
            case PatchEventType.UserEdited:
                await this.handleUserEdited(params as PatchEventParams[PatchEventType.UserEdited])
                break;
            case PatchEventType.UserOnDuty:
                await this.handleUserOnDuty(params as PatchEventParams[PatchEventType.UserOnDuty])
                break;
            case PatchEventType.UserOffDuty:
                await this.handleUserOffDuty(params as PatchEventParams[PatchEventType.UserOffDuty])
                break;
            case PatchEventType.UserChangedRolesInOrg:
                await this.handleUserChangedRolesInOrg(params as PatchEventParams[PatchEventType.UserChangedRolesInOrg])
                break;
            case PatchEventType.UserAddedToOrg:
                await this.handleUserAddedToOrg(params as PatchEventParams[PatchEventType.UserAddedToOrg])
                break;
            // TODO: case PatchEventType.UserRemovedFromOrg:
            case PatchEventType.RequestCreated:
                await this.handleRequestCreated(params as PatchEventParams[PatchEventType.RequestCreated])
                break;
            case PatchEventType.RequestEdited:
                await this.handleRequestEdited(params as PatchEventParams[PatchEventType.RequestEdited])
                break;
            case PatchEventType.RequestDeleted:
                await this.handleRequestDeleted(params as PatchEventParams[PatchEventType.RequestDeleted])
                break;
            case PatchEventType.RequestRespondersRequestToJoin: 
                await this.handleRequestRespondersRequestToJoin(params as PatchEventParams[PatchEventType.RequestRespondersRequestToJoin])
                break;
            case PatchEventType.RequestRespondersAccepted:
                await this.handleRequestRespondersAccepted(params as PatchEventParams[PatchEventType.RequestRespondersAccepted]) 
                break;
            case PatchEventType.RequestRespondersJoined: 
                await this.handleResponderJoinedRequest(params as PatchEventParams[PatchEventType.RequestRespondersJoined])
                break;
            case PatchEventType.RequestRespondersLeft: 
                await this.handleResponderLeftRequest(params as PatchEventParams[PatchEventType.RequestRespondersLeft])
                break;
            case PatchEventType.RequestRespondersNotified: 
                await this.handleRespondersNotified(params as PatchEventParams[PatchEventType.RequestRespondersNotified])
                break;
            case PatchEventType.RequestRespondersRemoved:
                await this.handleRequestRespondersRemoved(params as PatchEventParams[PatchEventType.RequestRespondersRemoved]) 
                break;
            case PatchEventType.RequestRespondersDeclined:
                await this.handleRequestRespondersDeclined(params as PatchEventParams[PatchEventType.RequestRespondersDeclined])
                break;
            case PatchEventType.OrganizationEdited:
                await this.handleOrganizationEdited(params as PatchEventParams[PatchEventType.OrganizationEdited])
                break;
            // TODO: case PatchEventType.OrganizationDeleted:
            case PatchEventType.OrganizationTagsUpdated:
                await this.handleOrganizationTagsUpdated(params as PatchEventParams[PatchEventType.OrganizationTagsUpdated])
                break;
            case PatchEventType.OrganizationAttributesUpdated:
                await this.handleOrganizationAttributesUpdated(params as PatchEventParams[PatchEventType.OrganizationAttributesUpdated])
                break;
            case PatchEventType.OrganizationRoleCreated:
                await this.handleOrganizationRoleCreated(params as PatchEventParams[PatchEventType.OrganizationRoleCreated])
                break;
            case PatchEventType.OrganizationRoleEdited:
                await this.handleOrganizationRoleEdited(params as PatchEventParams[PatchEventType.OrganizationRoleEdited])
                break;
            case PatchEventType.OrganizationRoleDeleted:
                await this.handleOrganizationRoleDeleted(params as PatchEventParams[PatchEventType.OrganizationRoleDeleted])
                break;
            case PatchEventType.SystemDynamicConfigUpdated:
                await this.handleDynamicConfigUpdate(params as PatchEventParams[PatchEventType.SystemDynamicConfigUpdated])                
                break;
        }
    }

    async handleForcedLogout(
        event: PatchEventType.UserForceLogout, 
        params: PatchEventParams[PatchEventType.UserForceLogout]
    ) {
        const { userId } = params;
        const user = await this.db.resolveUser(userId)

        // drop packet if they aren't connected 
        const sockets = await this.adapter.fetchSockets({
            rooms: new Set([userId]),
            except: new Set() // lib has a bug that this fixes
        })

        const packet: PatchEventPacket<PatchEventType.UserForceLogout> = {
            event,
            params
        }

        // piggyback on background notifications in case their socket isn't connected right now
        const notification: NotificationMetadata<PatchEventType.UserForceLogout> = {
            to: user.push_token,
            body: notificationLabel(event),
            payload: packet
        }

        if (sockets.length > 1) {
            //THIS SHOULDN'T HAPPEN
            throw `Multiple sockets registered for user: ${userId}`
        } if (sockets.length < 1) {
            // socket isn't connected so just send as a notification
            if (notification.to) {
                await this.notifications.send(notification)
            }
        } else {
            try {
                // try to send by socket
                const socket = sockets[0] as SocketIO.Socket;

                await new Promise<void>((resolve, reject) => {
                    try {
                        socket.timeout(3000).emit('message', packet, (err) => {
                            if (err) {
                                return reject()
                            }
    
                            socket.disconnect(true)
                            resolve()
                        })
                    } catch (e) {
                        console.error('Error sending socket attempt')
                        resolve()
                    }
                })
            } catch (e) {
                // fallback to using notification
                if (notification.to) {
                    await this.notifications.send(notification)
                }
            }
        }
    }

    async handleResponderJoinedRequest(payload: PatchEventParams[PatchEventType.RequestRespondersJoined]) {
        const request = await this.db.resolveRequest(payload.requestId);
        const org = await this.db.resolveOrganization(payload.orgId);
        const fullOrg = await this.db.fullOrganization(org);

        const requestAdmins = await this.requestAdminsInOrg(fullOrg);
        const usersOnRequest = await this.orgMembersOnRequest(request, fullOrg);

        const responderName = usersOnRequest.has(payload.responderId)
            ? usersOnRequest.get(payload.responderId).userName
            : (await this.db.resolveUser(payload.responderId)).name;

        const body = notificationLabel(PatchEventType.RequestRespondersJoined, request.displayId, responderName, org.requestPrefix);
        const configs: SendConfig[] = [];

        for (const admin of Array.from(requestAdmins.values())) {
            // dedup
            if (admin.userId == payload.responderId) {
                continue;
            }
            
            admin.body = body
            configs.push(admin as SendConfig)
        }

        for (const responder of Array.from(usersOnRequest.values())) {
            // dedup
            if (responder.userId == payload.responderId || requestAdmins.has(responder.userId)) {
                continue;
            }

            responder.body = body
            configs.push(responder as SendConfig)
        }

        await this.send(configs, {
            event: PatchEventType.RequestRespondersJoined,
            params: payload
        });
    }

    async handleRespondersNotified(payload: PatchEventParams[PatchEventType.RequestRespondersNotified]) {
        const usersToNotify = await this.db.getUsersByIds(payload.userIds)
        const notifier = await this.db.getUserById(payload.notifierId);
        const req = await this.db.resolveRequest(payload.requestId);
        const org = await this.db.resolveOrganization(req.orgId);
        const fullOrg = await this.db.fullOrganization(org);
        const admins = await this.requestAdminsInOrg(fullOrg);

        const body = notificationLabel(PatchEventType.RequestRespondersNotified, req.displayId, notifier.name, org.requestPrefix, !!req.positions.length);

        const configs: SendConfig[] = [];

        for (const user of usersToNotify) {
            // dedup admins
            admins.delete(user.id)

            // make sure user hasn't been removed from org
            if (!(await this.userInOrg(org, user.id))) {
                continue;
            }

            configs.push({
                userId: user.id,
                userName: user.name,
                pushToken: user.push_token,
                body
            })
        }

        const adminConfigs: SendConfig[] = [];

        for (const adminConf of admins.values()) {
            // dedup notifier
            if (payload.notifierId == adminConf.userId) {
                continue;
            }

            adminConfigs.push({
                ...adminConf,
                body: ''
            } as SendConfig)
        }

        await this.send(configs, {
            event: PatchEventType.RequestRespondersNotified,
            params: payload
        })

        await this.send(adminConfigs, {
            event: PatchEventType.RequestRespondersNotified,
            params: payload,
            silent: true
        })
    }

    async handleNewRequestChatMessage(payload: PatchEventParams[PatchEventType.RequestChatNewMessage]) {
        const org = await this.db.resolveOrganization(payload.orgId)
        const fullOrg = await this.db.fullOrganization(org)
        const request = await this.db.resolveRequest(payload.requestId)
        const orgMembersOnRequest = await this.orgMembersOnRequest(request, fullOrg);
        const requestAdmins = await this.requestAdminsInOrg(fullOrg);
        const senderName = orgMembersOnRequest.get(payload.userId)?.userName || requestAdmins.get(payload.userId)?.userName || ''
        const body = notificationLabel(PatchEventType.RequestChatNewMessage, request.displayId, senderName, org.requestPrefix)
        const configs: SendConfig[] = [];

        for (const orgMember of Array.from(orgMembersOnRequest.values())) {
            // dedup admins
            requestAdmins.delete(orgMember.userId)

            // dedup sender
            if (payload.userId == orgMember.userId) {
                continue;
            }

            orgMember.body = body
            configs.push(orgMember as SendConfig)
        }

        for (const admin of Array.from(requestAdmins.values())) {
            // dedup sender
            if (payload.userId == admin.userId) {
                continue;
            }

            admin.body = body
            configs.push(admin as SendConfig)
        }

        await this.send(configs, { event: PatchEventType.RequestChatNewMessage, params: payload })
    }

    async handleResponderLeftRequest(payload: PatchEventParams[PatchEventType.RequestRespondersLeft]) {
        const request = await this.db.resolveRequest(payload.requestId);
        const org = await this.db.resolveOrganization(payload.orgId);
        const fullOrg = await this.db.fullOrganization(org);

        const requestAdmins = await this.requestAdminsInOrg(fullOrg);
        const usersOnRequest = await this.orgMembersOnRequest(request, fullOrg);

        const responderName = usersOnRequest.has(payload.responderId)
            ? usersOnRequest.get(payload.responderId).userName
            : await (await this.db.resolveUser(payload.responderId)).name;

        const body = notificationLabel(PatchEventType.RequestRespondersLeft, request.displayId, responderName, org.requestPrefix);
        const configs: SendConfig[] = [];

        for (const responder of Array.from(usersOnRequest.values())) {
            //dedup admins
            requestAdmins.delete(responder.userId)

            // dedup responder that left
            if (responder.userId == payload.responderId) {
                continue;
            }

            responder.body = body
            configs.push(responder as SendConfig)
        }

        for (const admin of Array.from(requestAdmins.values())) {
            admin.body = body
            configs.push(admin as SendConfig)
        }

        await this.send(configs, {
            event: PatchEventType.RequestRespondersLeft,
            params: payload
        });
    }

    async handleRequestRespondersRequestToJoin(params: PatchEventParams[PatchEventType.RequestRespondersRequestToJoin]) {
        const request = await this.db.resolveRequest(params.requestId);
        const org = await this.db.resolveOrganization(params.orgId);
        const fullOrg = await this.db.fullOrganization(org);

        const requestAdmins = await this.requestAdminsInOrg(fullOrg);

        const adminConfigs: SendConfig[] = [];

        const requesterName = requestAdmins.get(params.responderId)?.userName
            || (await this.db.resolveUser(params.responderId)).name

        const userRequestedBody = notificationLabel(PatchEventType.RequestRespondersRequestToJoin, request.displayId, requesterName, org.requestPrefix)

        for (const admin of Array.from(requestAdmins.values())) {
            if (admin.userId != params.responderId) {
                admin.body = userRequestedBody
                adminConfigs.push(admin as SendConfig)
            }
        }

        await this.send(adminConfigs, {
            event: PatchEventType.RequestRespondersRequestToJoin,
            params
        } as PatchEventPacket<PatchEventType.RequestRespondersRequestToJoin>)
    }

    async handleRequestRespondersAccepted(params: PatchEventParams[PatchEventType.RequestRespondersAccepted]) {
        const request = await this.db.resolveRequest(params.requestId);
        const org = await this.db.resolveOrganization(params.orgId);
        const fullOrg = await this.db.fullOrganization(org);

        const requestAdmins = await this.requestAdminsInOrg(fullOrg);
        const usersOnRequest = await this.orgMembersOnRequest(request, fullOrg);

        const joinedConfigs: SendConfig[] = [];
        let acceptedConfig: SendConfig;

        const accepted = await this.userIdToSendConfig(params.responderId, [usersOnRequest, requestAdmins])
        
        // make sure user hasn't been removed from org
        if (!(await this.userInOrg(org, params.responderId))) {
            // if they have, the acceptance is a noop
            return
        }

        const accepter = await this.userIdToSendConfig(params.accepterId, [usersOnRequest, requestAdmins])

        const userJoinedBody = notificationLabel(PatchEventType.RequestRespondersJoined, request.displayId, accepted.userName, org.requestPrefix)
        const userAcceptedBody = notificationLabel(PatchEventType.RequestRespondersAccepted, request.displayId, accepter.userName, org.requestPrefix)

        acceptedConfig = {
            ...accepted,
            body: userAcceptedBody
        } as SendConfig

        for (const user of Array.from(usersOnRequest.values())) {
            requestAdmins.delete(user.userId)
            
            if (user.userId != params.accepterId && user.userId != params.responderId) {
                user.body = userJoinedBody
                joinedConfigs.push(user as SendConfig)
            }
        }

        for (const admin of Array.from(requestAdmins.values())) {
            if (admin.userId != params.accepterId && admin.userId != params.responderId) {
                admin.body = userJoinedBody
                joinedConfigs.push(admin as SendConfig)
            }
        }

        // Accepted user gets accepted message
        await this.send([acceptedConfig], {
            event: PatchEventType.RequestRespondersAccepted,
            params
        } as PatchEventPacket<PatchEventType.RequestRespondersAccepted>)

        // all request admins + responders on the requewst - the approver = userjoined
        await this.send(joinedConfigs, {
            event: PatchEventType.RequestRespondersJoined,
            params
        } as PatchEventPacket<PatchEventType.RequestRespondersJoined>)
    }

    async handleRequestRespondersRemoved(params: PatchEventParams[PatchEventType.RequestRespondersRemoved]) {
        const request = await this.db.resolveRequest(params.requestId);
        const org = await this.db.resolveOrganization(params.orgId);
        const fullOrg = await this.db.fullOrganization(org);

        const requestAdmins = await this.requestAdminsInOrg(fullOrg);
        const usersOnRequest = await this.orgMembersOnRequest(request, fullOrg);

        const leftConfigs: SendConfig[] = [];
        let removedConfig: SendConfig;
        
        const responderName = usersOnRequest.get(params.responderId)?.userName 
            || requestAdmins.get(params.responderId)?.userName
            || (await this.db.resolveUser(params.responderId)).name

        let remover = requestAdmins.get(params.removerId);

        if (!remover) {
            const fullremover = await this.db.resolveUser(params.removerId);
            
            remover = {
                userId: fullremover.id,
                userName: fullremover.name,
                pushToken: fullremover.push_token,    
            }
        }

        const userJoinedBody = notificationLabel(PatchEventType.RequestRespondersLeft, request.displayId, responderName, org.requestPrefix)
        const userAcceptedBody = notificationLabel(PatchEventType.RequestRespondersRemoved, request.displayId, remover.userName, org.requestPrefix)

        removedConfig = {
            ...remover,
            body: userAcceptedBody
        } as SendConfig

        for (const user of Array.from(usersOnRequest.values())) {
            requestAdmins.delete(user.userId)
            
            if (user.userId != params.removerId && user.userId != params.responderId) {
                user.body = userJoinedBody
                leftConfigs.push(user as SendConfig)
            }
        }

        for (const admin of Array.from(requestAdmins.values())) {
            if (admin.userId != params.removerId && admin.userId != params.responderId) {
                admin.body = userJoinedBody
                leftConfigs.push(admin as SendConfig)
            }
        }

        // Removed responder gets removed message
        await this.send([removedConfig], {
            event: PatchEventType.RequestRespondersRemoved,
            params
        } as PatchEventPacket<PatchEventType.RequestRespondersRemoved>)

        // admins + responders on request - remover = userleft
        await this.send(leftConfigs, {
            event: PatchEventType.RequestRespondersLeft,
            params
        } as PatchEventPacket<PatchEventType.RequestRespondersLeft>)
    }

    async handleRequestRespondersDeclined(params: PatchEventParams[PatchEventType.RequestRespondersDeclined]){
        const declinedUser = await this.db.resolveUser(params.responderId);
        const decliner = await this.db.resolveUser(params.declinerId)
        const request = await this.db.resolveRequest(params.requestId)
        const org = await this.db.resolveOrganization(params.orgId);

        // make sure user hasn't been removed from org
        if (!(await this.userInOrg(org, params.responderId))) {
            return;
        }

        await this.send([
            {
                userId: declinedUser.id,
                userName: declinedUser.name,
                body: notificationLabel(PatchEventType.RequestRespondersDeclined, request.displayId, decliner.name, org.requestPrefix),
                pushToken: declinedUser.push_token
            }
        ], {
            event: PatchEventType.RequestRespondersDeclined,
            params
        })
    }

    async handleRequestCreated(payload: PatchEventParams[PatchEventType.RequestCreated]) {
        await this.updateUsersInOrg(PatchEventType.RequestCreated, payload, payload.orgId, notificationLabel(PatchEventType.RequestCreated))
    }

    async handleRequestEdited(payload: PatchEventParams[PatchEventType.RequestEdited]) {
        await this.updateUsersInOrg(PatchEventType.RequestEdited, payload, payload.orgId, notificationLabel(PatchEventType.RequestEdited))
    }

    async handleRequestDeleted(payload: PatchEventParams[PatchEventType.RequestDeleted]) {
        await this.updateUsersInOrg(PatchEventType.RequestDeleted, payload, payload.orgId, notificationLabel(PatchEventType.RequestDeleted), [payload.deleterId])
    }

    async handleUserEdited(payload: PatchEventParams[PatchEventType.UserEdited]) {
        await this.updateUsersInOrg(PatchEventType.UserEdited, payload, payload.orgId, notificationLabel(PatchEventType.UserEdited))
    }

    async handleUserOnDuty(payload: PatchEventParams[PatchEventType.UserOnDuty]) {
        await this.updateUsersInOrg(PatchEventType.UserOnDuty, payload, payload.orgId, notificationLabel(PatchEventType.UserOnDuty))
    }

    async handleUserOffDuty(payload: PatchEventParams[PatchEventType.UserOffDuty]) {
        await this.updateUsersInOrg(PatchEventType.UserOffDuty, payload, payload.orgId, notificationLabel(PatchEventType.UserOffDuty))
    }

    async handleUserChangedRolesInOrg(payload: PatchEventParams[PatchEventType.UserChangedRolesInOrg]) {
        await this.updateUsersInOrg(PatchEventType.UserChangedRolesInOrg, payload, payload.orgId, notificationLabel(PatchEventType.UserChangedRolesInOrg))
    }

    async handleUserAddedToOrg(payload: PatchEventParams[PatchEventType.UserAddedToOrg]) {
        await this.updateUsersInOrg(PatchEventType.UserAddedToOrg, payload, payload.orgId, notificationLabel(PatchEventType.UserAddedToOrg))
    }

    async handleOrganizationEdited(params: PatchEventParams[PatchEventType.OrganizationEdited]) {
        await this.updateUsersInOrg(PatchEventType.OrganizationEdited, params, params.orgId, notificationLabel(PatchEventType.OrganizationEdited))
    }

    async handleOrganizationTagsUpdated(params: PatchEventParams[PatchEventType.OrganizationTagsUpdated]) {
        await this.updateUsersInOrg(PatchEventType.OrganizationTagsUpdated, params, params.orgId, notificationLabel(PatchEventType.OrganizationTagsUpdated))
    }

    async handleOrganizationAttributesUpdated(params: PatchEventParams[PatchEventType.OrganizationAttributesUpdated]) {
        await this.updateUsersInOrg(PatchEventType.OrganizationAttributesUpdated, params, params.orgId, notificationLabel(PatchEventType.OrganizationAttributesUpdated))
    }

    async handleOrganizationRoleCreated(params: PatchEventParams[PatchEventType.OrganizationRoleCreated]) {
        await this.updateUsersInOrg(PatchEventType.OrganizationRoleCreated, params, params.orgId, notificationLabel(PatchEventType.OrganizationRoleCreated))
    }

    async handleOrganizationRoleEdited(params: PatchEventParams[PatchEventType.OrganizationRoleEdited]) {
        await this.updateUsersInOrg(PatchEventType.OrganizationRoleEdited, params, params.orgId, notificationLabel(PatchEventType.OrganizationRoleEdited))
    }

    async handleOrganizationRoleDeleted(params: PatchEventParams[PatchEventType.OrganizationRoleDeleted]) {
        await this.updateUsersInOrg(PatchEventType.OrganizationRoleDeleted, params, params.orgId, notificationLabel(PatchEventType.OrganizationRoleDeleted))
    }

    async handleDynamicConfigUpdate(params: PatchEventParams[PatchEventType.SystemDynamicConfigUpdated]) {
        await this.updateAllUsers(PatchEventType.SystemDynamicConfigUpdated, params, notificationLabel(PatchEventType.SystemDynamicConfigUpdated))
    }

    async updateAllUsers<Event extends PatchEventType>(
        event: Event,
        params: PatchEventParams[Event],
        body: string
    ) {
        const allUserConfigs = (await this.db.users.find({})).map(u => {
            return {
                userId: u.id,
                userName: u.name,
                pushToken: u.push_token,
                body: body
            } as SendConfig
        })

        await this.send(allUserConfigs, { event, params })
    }

    async updateUsersInOrg<Event extends PatchEventType>(
        event: Event,
        params: PatchEventParams[Event],
        orgId: string,
        body: string,
        toExclude?: string[]
    ) {
        const org = await this.db.resolveOrganization(orgId)
        const fullOrg = await this.db.fullOrganization(org)
        const usersInOrg = await this.usersInOrg(fullOrg)

        for (const userToExclude of (toExclude || [])) {
            usersInOrg.delete(userToExclude)
        }

        const configs: SendConfig[] = [];

        for (const user of Array.from(usersInOrg.values())) {
            user.body = body
            configs.push(user as SendConfig)
        }

        await this.send(configs, { event, params })
    }

    async usersInOrg(org: OrganizationDoc) {
        const users = new Map<string, Partial<SendConfig>>()

        org.members.forEach((member: UserModel) => {
            users.set(member.id, {
                userId: member.id,
                userName: member.name,
                pushToken: (member as unknown as UserModel).push_token
            })
        })

        return users;
    }

    async orgMembersOnRequest(req: HelpRequestDoc, org: OrganizationDoc) {
        const users = new Map<string, Partial<SendConfig>>()

        const userIds = usersAssociatedWithRequest(req);

        org.members.forEach((member: UserModel) => {
            if (userIds.includes(member.id)) {
                users.set(member.id, {
                    userId: member.id,
                    userName: member.name,
                    pushToken: (member as unknown as UserModel).push_token
                })
            }
        })

        return users;
    }

    async requestAdminsInOrg(org: OrganizationDoc) {
        const admins = new Map<string, Partial<SendConfig>>()
        
        org.members.forEach((member: UserModel) => {

            try {
                const userRoles = (member.organizations[org.id]?.roleIds || []).map(roleId => {
                    return org.roleDefinitions.find(def => def.id == roleId)
                }).filter(r => !!r)

                const userIsAdmin = resolvePermissionsFromRoles(userRoles).has(PatchPermissions.RequestAdmin)

                if (userIsAdmin) {
                    admins.set(member.id, {
                        userId: member.id,
                        userName: member.name,
                        pushToken: (member as unknown as UserModel).push_token
                    })
                }
            } catch (e) {
                console.error(`Error trying to collect possbile request admin: ${member.id}`)
            }
        })

        return admins;
    }

    async userIdToSendConfig(userId: string, prefetchedStores?: Map<string, Partial<SendConfig>>[]) {
        if (prefetchedStores) {
            for (const store of prefetchedStores) {
                const config = store.get(userId);
                
                if (config) {
                    return config;
                }
            }
        }

        const user = await this.db.resolveUser(userId);
        
        return {
            userId: user.id,
            userName: user.name,
            pushToken: user.push_token
        } as Partial<SendConfig>
    }

    async userInOrg(orgId: string | OrganizationDoc, userId: string) {
        const org = await this.db.resolveOrganization(orgId);
        
        return org.members.some(ref => {
            return ref == userId || (ref as UserModel).id == userId
        })
    }

    async send(
        configs: SendConfig[], 
        packet: PatchEventPacket
    ): Promise<void> 
    {
        const notifications: NotificationMetadata<any>[] = [];
        const socketAttempts = [];

        for (const config of configs) {

            const sockets = await this.adapter.fetchSockets({
                rooms: new Set([config.userId]),
                except: new Set() // lib has a bug that this fixes
            })

            const socket = sockets[0] as SocketIO.Socket;

            const patchNotification: PatchNotification = {
                body: config.body,
                payload: packet
            }

            const notification: NotificationMetadata<PatchEventType> = {
                to: config.pushToken,
                ...patchNotification
            }

            if (!socket) {
                notifications.push(notification)
                continue;
            }
            
            try {
                await verifyRefreshToken(socket.data?.refreshToken, this.db);
            } catch (e) {
                await this.pubSub.sys(PatchEventType.UserForceLogout, { 
                    userId: config.userId,
                    refreshToken: socket.data?.refreshToken,
                })
    
                continue;
            }

            const socketAttempt = new Promise<void>((resolve, _) => {
                
                try {
                    socket.timeout(3000).emit('message', patchNotification, (err) => {
                        if (err) {
                            notifications.push(notification)
                        }

                        resolve()
                    })
                } catch (e) {
                    console.error('Error sending socket attempt')
                    resolve()
                }
            })

            socketAttempts.push(socketAttempt)
        }

        await Promise.all(socketAttempts);

        try {
            // Don't fail if some user's haven't accepted notifications
            await this.notifications.sendBulk(notifications.filter(meta => !!meta.to))
        } catch (e) {
            console.error(`Error sending update over notification: ${e}`)
        }
    }
}