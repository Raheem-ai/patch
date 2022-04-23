import { Inject, registerExceptionType } from "@tsed/common";
import { IO, Nsp, Socket, SocketService as Service, SocketSession} from "@tsed/socketio";
import { NotificationType, PatchEventParams, PatchEventType, PatchUIEvent, PatchUIEventPacket, UserRole } from "common/models";
import * as SocketIO from "socket.io";
import { verifyRefreshToken } from "../auth";
import { UserDoc, UserModel } from "../models/user";
import { DBManager } from "./dbManager";
import Notifications, { NotificationMetadata } from "./notifications";
import { PubSubService } from "./pubSubService";
import { RedisAdapter } from "@socket.io/redis-adapter";

type RaheemSocket = SocketIO.Socket<any, any, any, { refreshToken: string }>;

@Service()
export class MySocketService {

    @Inject(DBManager) db: DBManager;

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
                rooms: new Set([user.id])
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
            case PatchEventType.UserCreated:
            case PatchEventType.UserDeleted: // TODO: How should we handle this?
                    // noop
                break;
            // send best try socket update + notification backup
            case PatchEventType.UserForceLogout:
                await this.handleForcedLogout(event, params as any)
                break;
            // send best try socket update 
            case PatchEventType.UserEdited:
            case PatchEventType.UserOnDuty:
            case PatchEventType.UserOffDuty:
            case PatchEventType.UserChangedRolesInOrg:
                await this.handleUserUpdate(event, params as any)
                break;

            // send best try socket update 
            case PatchEventType.UserAddedToOrg:
            case PatchEventType.UserRemovedFromOrg:
                await this.handleUserOrgUpdate(event, params as any)
                break;

            // send best try socket update + notification backup
            case PatchEventType.RequestCreated:
            case PatchEventType.RequestEdited:
            case PatchEventType.RequestDeleted:
                await this.handleRequestUpdate(event, params as any)
                break;

            // send best try socket update + notification backup
            case PatchEventType.RequestChatNewMessage: 
            case PatchEventType.RequestRespondersAccepted: 
            case PatchEventType.RequestRespondersJoined: 
            case PatchEventType.RequestRespondersLeft: 
            case PatchEventType.RequestRespondersRemoved: 
            case PatchEventType.RequestRespondersDeclined:
            case PatchEventType.RequestRespondersAssigned:
                await this.handleScopedRequestUpdate(event, params as any)
                break;

            case PatchEventType.OrganizationEdited:
            case PatchEventType.OrganizationDeleted:
                await this.handleOrganizationUpdate(event, params as any)
                break;

            case PatchEventType.OrganizationRoleCreated:
            case PatchEventType.OrganizationRoleEdited:
            case PatchEventType.OrganizationRoleDeleted:
                await this.handleOrganizationRoleUpdate(event, params as any)
                break;

            case PatchEventType.OrganizationAttributeCategoryEdited:
            case PatchEventType.OrganizationAttributeCategoryDeleted:
                await this.handleOrganizationAttributeCateogryUpdate(event, params as any);
                break;

            case PatchEventType.OrganizationAttributeEdited:
            case PatchEventType.OrganizationAttributeDeleted:
                await this.handleOrganizationAttributeUpdate(event, params as any);
                break;

            case PatchEventType.OrganizationTagCategoryEdited:
            case PatchEventType.OrganizationTagCategoryDeleted:
                await this.handleOrganizationTagCategoryUpdate(event, params as any);
                break;

            case PatchEventType.OrganizationTagEdited:
            case PatchEventType.OrganizationTagDeleted:
                await this.handleOrganizationTagUpdate(event, params as any);
                break;
        }
    }

    async handleForcedLogout<SysEvent extends PatchEventType.UserForceLogout>(
        sysEvent: SysEvent, 
        sysParams: PatchEventParams[SysEvent]
    ) {
        const { userId } = sysParams;
        const user = await this.db.resolveUser(userId)

        // drop packet if they aren't connected 
        const sockets = await this.io.volatile.in(userId).fetchSockets();

        if (sockets.length > 1) {
            //THIS SHOULDN'T HAPPEN
            throw `Multiple sockets registered for user: ${userId}`
        }

        for (const socket of sockets) {

            // send refreshToken we're looking to invalidate so UI can dedup races
            const msg: PatchUIEventPacket<PatchUIEvent.ForceLogout> = {
                event: PatchUIEvent.ForceLogout,
                params: {
                    refreshToken: socket.data?.refreshToken,
                },
                sysEvent,
                sysParams
            };

            // piggyback on background notifications in case their socket isn't connected right now
            const notification: NotificationMetadata<NotificationType.UIUpdate> = {
                type: NotificationType.UIUpdate,
                to: user.push_token,
                body: ``,
                payload: { uiEvent: msg }
            }

            socket.emit('message', msg)
            socket.disconnect(true)

            await this.notifications.send(notification)
        }

    }

    // Do we want to send a notification?
    async handleOrganizationUpdate<SysEvent extends 
        PatchEventType.OrganizationEdited
        | PatchEventType.OrganizationDeleted
    >(
        sysEvent: SysEvent, 
        sysParams: PatchEventParams[SysEvent]
    ) {  
        const { orgId } = sysParams;
        const org = await this.db.protectedOrganization(await this.db.resolveOrganization(orgId));

        const notifications: NotificationMetadata<any>[] = [];

        for (const user of org.members as UserModel[]) {
            const msg: PatchUIEventPacket<PatchUIEvent.UpdateResource, SysEvent> = {
                event: PatchUIEvent.UpdateResource,
                params: { 
                    orgId,
                },
                sysEvent,
                sysParams
            };

            const notification: NotificationMetadata<NotificationType.UIUpdate> = {
                type: NotificationType.UIUpdate,
                to: (user as UserModel).push_token,
                body: ``,
                payload: { uiEvent: msg }
            }

            notifications.push(notification);

            try {
                await this.send(user.id, msg)
            } catch (e) {
                console.error(`Error sending organization update over socket: ${e}`)
            }
        }

        try {
            await this.notifications.sendBulk(notifications)
        } catch (e) {
            console.error(`Error sending organization update over notification: ${e}`)
        }
    }

    // Do we want to send a notification?
    async handleOrganizationRoleUpdate<SysEvent extends 
        PatchEventType.OrganizationRoleCreated
        | PatchEventType.OrganizationRoleEdited
        | PatchEventType.OrganizationRoleDeleted
    >(
        sysEvent: SysEvent, 
        sysParams: PatchEventParams[SysEvent]
    ) {  
        const { roleId, orgId } = sysParams;
        const org = await this.db.protectedOrganization(await this.db.resolveOrganization(orgId));

        const notifications: NotificationMetadata<any>[] = [];
        for (const user of org.members as UserModel[]) {
            const msg: PatchUIEventPacket<PatchUIEvent.UpdateResource, SysEvent> = {
                event: PatchUIEvent.UpdateResource,
                params: { 
                    roleId,
                    orgId,
                },
                sysEvent,
                sysParams
            };

            // Only send notifications to users affected by the Role change.
            // TODO: Maybe also send to other Role Admins?
            if (user.organizations[orgId].roleIds.includes(roleId)) {
                const notification: NotificationMetadata<NotificationType.UIUpdate> = {
                    type: NotificationType.UIUpdate,
                    to: (user as UserModel).push_token,
                    body: ``,
                    payload: { uiEvent: msg }
                }
                notifications.push(notification);
            }

            try {
                await this.send(user.id, msg)
            } catch (e) {
                console.error(`Error sending organization Role update over socket: ${e}`)
            }
        }

        try {
            await this.notifications.sendBulk(notifications)
        } catch (e) {
            console.error(`Error sending organization Role update over notification: ${e}`)
        }
    }

    async handleOrganizationAttributeCateogryUpdate<SysEvent extends 
        PatchEventType.OrganizationAttributeCategoryEdited
        | PatchEventType.OrganizationAttributeCategoryDeleted
    >(
        sysEvent: SysEvent, 
        sysParams: PatchEventParams[SysEvent]
    ) {
        const { categoryId, orgId } = sysParams;
        const org = await this.db.protectedOrganization(await this.db.resolveOrganization(orgId));

        const notifications: NotificationMetadata<any>[] = [];
        for (const user of org.members as UserModel[]) {
            const msg: PatchUIEventPacket<PatchUIEvent.UpdateResource, SysEvent> = {
                event: PatchUIEvent.UpdateResource,
                params: { 
                    attributeCategoryId: categoryId,
                    orgId,
                },
                sysEvent,
                sysParams
            };

            // Only send notifications to users affected by the Attribute Category update.
            if (categoryId in user.organizations[orgId].attributes) {
                const notification: NotificationMetadata<NotificationType.UIUpdate> = {
                    type: NotificationType.UIUpdate,
                    to: (user as UserModel).push_token,
                    body: ``,
                    payload: { uiEvent: msg }
                }
                notifications.push(notification);
            }

            try {
                await this.send(user.id, msg)
            } catch (e) {
                console.error(`Error sending organization Attribute Category update over socket: ${e}`)
            }
        }

        try {
            await this.notifications.sendBulk(notifications)
        } catch (e) {
            console.error(`Error sending organization Attribute Category update over notification: ${e}`)
        }
    }

    async handleOrganizationAttributeUpdate<SysEvent extends 
        PatchEventType.OrganizationAttributeEdited
        | PatchEventType.OrganizationAttributeDeleted
    >(
        sysEvent: SysEvent, 
        sysParams: PatchEventParams[SysEvent]
    ) {
        const { orgId, categoryId, attributeId } = sysParams;
        const org = await this.db.protectedOrganization(await this.db.resolveOrganization(orgId));

        const notifications: NotificationMetadata<any>[] = [];
        for (const user of org.members as UserModel[]) {
            const msg: PatchUIEventPacket<PatchUIEvent.UpdateResource, SysEvent> = {
                event: PatchUIEvent.UpdateResource,
                params: { 
                    attributeId,
                    orgId,
                    attributeCategoryId: categoryId
                },
                sysEvent,
                sysParams
            };

            // Only send notifications to users affected by the Attribute update.
            if (categoryId in user.organizations[orgId].attributes) {
                if (attributeId in user.organizations[orgId].attributes[categoryId]) {
                    const notification: NotificationMetadata<NotificationType.UIUpdate> = {
                        type: NotificationType.UIUpdate,
                        to: (user as UserModel).push_token,
                        body: ``,
                        payload: { uiEvent: msg }
                    }
                    notifications.push(notification);
                }
            }

            try {
                await this.send(user.id, msg)
            } catch (e) {
                console.error(`Error sending organization Attribute update over socket: ${e}`)
            }
        }

        try {
            await this.notifications.sendBulk(notifications)
        } catch (e) {
            console.error(`Error sending organization Attribute update over notification: ${e}`)
        }
    }

    async handleOrganizationTagCategoryUpdate<SysEvent extends 
        PatchEventType.OrganizationTagCategoryDeleted
        | PatchEventType.OrganizationTagCategoryEdited
    >(
        sysEvent: SysEvent, 
        sysParams: PatchEventParams[SysEvent]
    ) {
        const { categoryId, orgId } = sysParams;
        const org = await this.db.protectedOrganization(await this.db.resolveOrganization(orgId));

        const notifications: NotificationMetadata<any>[] = [];
        for (const user of org.members as UserModel[]) {
            const msg: PatchUIEventPacket<PatchUIEvent.UpdateResource, SysEvent> = {
                event: PatchUIEvent.UpdateResource,
                params: { 
                    tagCategoryId: categoryId,
                    orgId,
                },
                sysEvent,
                sysParams
            };

            const notification: NotificationMetadata<NotificationType.UIUpdate> = {
                type: NotificationType.UIUpdate,
                to: (user as UserModel).push_token,
                body: ``,
                payload: { uiEvent: msg }
            }
            notifications.push(notification);

            try {
                await this.send(user.id, msg)
            } catch (e) {
                console.error(`Error sending organization Tag Category update over socket: ${e}`)
            }
        }

        try {
            await this.notifications.sendBulk(notifications)
        } catch (e) {
            console.error(`Error sending organization Tag Category update over notification: ${e}`)
        }
    }

    async handleOrganizationTagUpdate<SysEvent extends 
        PatchEventType.OrganizationTagEdited
        | PatchEventType.OrganizationTagDeleted
    >(
        sysEvent: SysEvent, 
        sysParams: PatchEventParams[SysEvent]
    ) {
        const { orgId, tagId, categoryId } = sysParams;
        const org = await this.db.protectedOrganization(await this.db.resolveOrganization(orgId));

        const notifications: NotificationMetadata<any>[] = [];
        for (const user of org.members as UserModel[]) {
            const msg: PatchUIEventPacket<PatchUIEvent.UpdateResource, SysEvent> = {
                event: PatchUIEvent.UpdateResource,
                params: { 
                    tagId,
                    orgId,
                    tagCategoryId: categoryId
                },
                sysEvent,
                sysParams
            };

            const notification: NotificationMetadata<NotificationType.UIUpdate> = {
                type: NotificationType.UIUpdate,
                to: (user as UserModel).push_token,
                body: ``,
                payload: { uiEvent: msg }
            }
            notifications.push(notification);

            try {
                await this.send(user.id, msg)
            } catch (e) {
                console.error(`Error sending organization Tag update over socket: ${e}`)
            }
        }

        try {
            await this.notifications.sendBulk(notifications)
        } catch (e) {
            console.error(`Error sending organization Tag update over notification: ${e}`)
        }
    }

    async handleUserOrgUpdate<SysEvent extends 
        PatchEventType.UserAddedToOrg 
        | PatchEventType.UserRemovedFromOrg
    >(
        sysEvent: SysEvent, 
        sysParams: PatchEventParams[SysEvent]
    ) {  
        const { userId, orgId } = sysParams;
        const org = await this.db.protectedOrganization(await this.db.resolveOrganization(orgId));
                
        for (const member of org.members) {
            if (member.id != userId) {
                try {
                    const msg: PatchUIEventPacket<PatchUIEvent.UpdateResource, SysEvent> = {
                        event: PatchUIEvent.UpdateResource,                         
                        params: { 
                            userId,
                            orgId,
                            userList: true
                        },
                        sysEvent,
                        sysParams
                    };

                    await this.send(member.id, msg)
                } catch (e) {
                    console.error(`Error sending user/org update: ${e}`)
                }
            }
        }
    }

    async handleUserUpdate<SysEvent extends 
        PatchEventType.UserEdited 
        | PatchEventType.UserOnDuty 
        | PatchEventType.UserOffDuty 
        | PatchEventType.UserChangedRolesInOrg
    >(
        sysEvent: SysEvent, 
        sysParams: PatchEventParams[SysEvent]
    ) {
        const { userId } = sysParams;
        const user = await this.db.resolveUser(userId);
        const orgIds = Object.keys(user.organizations);

        const usersToNotify = new Set<string>()

        // notify all users in all orgs the edited user is a part of
        for (const orgId of orgIds) {
            const org = await this.db.protectedOrganization(await this.db.resolveOrganization(orgId));
            org?.members?.forEach(m => usersToNotify.add(m.id));
        }
                
        for (const id of Array.from(usersToNotify.values())) {
            if (id != userId) {
                try {
                    const msg: PatchUIEventPacket<PatchUIEvent.UpdateResource, SysEvent> = {
                        event: PatchUIEvent.UpdateResource,                         
                        params: { 
                            userId
                        },
                        sysEvent,
                        sysParams
                    };

                    await this.send(id, msg)
                } catch (e) {
                    console.error(`Error sending user/org update: ${e}`)
                }
            }
        }
    }


    async handleRequestUpdate<SysEvent extends 
        PatchEventType.RequestCreated | 
        PatchEventType.RequestEdited |
        PatchEventType.RequestDeleted
    >(
        sysEvent: SysEvent, 
        sysParams: PatchEventParams[SysEvent]
    ) {
        const { requestId } = sysParams;

        const request = await this.db.resolveRequest(requestId);
        const org = await this.db.resolveOrganization(request.orgId);

        const notifications: NotificationMetadata<any>[] = [];

        for (const user of org.members as UserModel[]) {
            const msg: PatchUIEventPacket<PatchUIEvent.UpdateResource, SysEvent> = {
                event: PatchUIEvent.UpdateResource,
                params: { 
                    requestId,
                    requestList: sysEvent != PatchEventType.RequestEdited
                },
                sysEvent,
                sysParams
            };

            const notification: NotificationMetadata<NotificationType.UIUpdate> = {
                type: NotificationType.UIUpdate,
                to: (user as UserModel).push_token,
                body: ``,
                payload: { uiEvent: msg }
            }

            notifications.push(notification);

            try {
                await this.send((user as UserModel).id, msg)
            } catch (e) {
                console.error(`Error sending user/org update over socket: ${e}`)
            }
        }

        try {
            await this.notifications.sendBulk(notifications)
        } catch (e) {
            console.error(`Error sending user/org update over notification: ${e}`)
        }

    }
    
    async handleScopedRequestUpdate<SysEvent extends 
        PatchEventType.RequestChatNewMessage |
        PatchEventType.RequestRespondersAccepted |
        PatchEventType.RequestRespondersJoined |
        PatchEventType.RequestRespondersLeft |
        PatchEventType.RequestRespondersRemoved |
        PatchEventType.RequestRespondersDeclined |
        PatchEventType.RequestRespondersAssigned 
    >(
        sysEvent: SysEvent, 
        sysParams: PatchEventParams[SysEvent]
    ) {
        const { requestId } = sysParams;

        const request = await this.db.resolveRequest(requestId);
        const org = await this.db.resolveOrganization(request.orgId);

        const dispatchersAndRespondersOnReq = org.members.filter((member: UserModel) => {
            const isDispatcher = member.organizations[request.orgId]?.roles?.includes(UserRole.Dispatcher)
            const isResponderOnReq = request.assignedResponderIds?.includes(member.id)

            return isDispatcher || isResponderOnReq
        });

        const notifications: NotificationMetadata<any>[] = [];

        for (const user of dispatchersAndRespondersOnReq) {
            const msg: PatchUIEventPacket<PatchUIEvent.UpdateResource, SysEvent> = {
                event: PatchUIEvent.UpdateResource,
                params: { 
                    requestId,
                },
                sysEvent,
                sysParams
            };

            const notification: NotificationMetadata<NotificationType.UIUpdate> = {
                type: NotificationType.UIUpdate,
                to: (user as UserModel).push_token,
                body: ``,
                payload: { uiEvent: msg }
            }

            notifications.push(notification);

            try {
                await this.send((user as UserModel).id, msg)
            } catch (e) {
                console.error(`Error sending user/org update over socket: ${e}`)
            }
        }

        try {
            await this.notifications.sendBulk(notifications)
        } catch (e) {
            console.error(`Error sending user/org update over notification: ${e}`)
        }

    }


    async send(userId: string, params: PatchUIEventPacket): Promise<boolean> {
        const sockets = await this.adapter.fetchSockets({
            rooms: new Set([userId]),
            flags: {
                // drop packet if they aren't connected vs buffering
                volatile: true
            }
        })

        if (!sockets.length) {
            return false;
        }

        if (sockets.length > 1) {
            //THIS SHOULDN'T HAPPEN
            throw `Multiple sockets registered for user: ${userId}`
        }

        const socket = sockets[0]
        
        // check time to make sure not expired
        try {
            await verifyRefreshToken(socket.data?.refreshToken, this.db);
        } catch (e) {
            await this.pubSub.sys(PatchEventType.UserForceLogout, { userId })

            return false;
        }

        this.io.in(userId).emit('message', params)

        return true;
    }
}