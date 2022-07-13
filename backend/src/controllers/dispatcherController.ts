import { BodyParams, Controller, HeaderParams, Inject, Post, Req } from "@tsed/common";
import { MongooseModel } from "@tsed/mongoose";
import API from 'common/api';
import { PatchEventType, PatchPermissions, UserRole } from "common/models";
import { RequireAllPermissions } from "../middlewares/userRoleMiddleware";
import { UserDoc, UserModel } from "../models/user";
import { ExpoPushErrorReceipt, ExpoPushSuccessTicket, ExpoPushErrorTicket } from "expo-server-sdk";
import { expo } from "../expo";
import Notifications, { NotificationMetadata } from '../services/notifications';
import { APIController, OrgId } from ".";
import { Required } from "@tsed/schema";
import { User } from "../protocols/jwtProtocol";
import { DBManager } from "../services/dbManager";
import { PubSubService } from "../services/pubSubService";
import { MySocketService } from "../services/socketService";

@Controller(API.namespaces.dispatch)
export class DispatcherController implements APIController<
    'confirmRequestToJoinRequest' 
    | 'declineRequestToJoinRequest' 
    | 'notifyRespondersAboutRequest' 
    | 'removeUserFromRequest'
    | 'ackRequestsToJoinNotification'
> {
    @Inject(UserModel) users: MongooseModel<UserModel>;
    
    @Inject(Notifications) notifications: Notifications;
    @Inject(DBManager) db: DBManager;
    @Inject(PubSubService) pubSub: PubSubService;
    @Inject(MySocketService) socket: MySocketService;

    @Post(API.server.notifyRespondersAboutRequest())
    @RequireAllPermissions([PatchPermissions.RequestAdmin])
    async notifyRespondersAboutRequest(
        @OrgId() orgId: string, 
        @User() user: UserDoc,
        @Required() @BodyParams('requestId') requestId: string, 
        @Required() @BodyParams('to') to: string[]
    ) {
        const updatedReq = await this.db.notifyRespondersAboutRequest(requestId, user.id, to);

        await this.pubSub.sys(PatchEventType.RequestRespondersNotified, {
            requestId,
            notifierId: user.id,
            userIds: to
        });

        return this.db.fullHelpRequest(updatedReq)
    }

    @Post(API.server.confirmRequestToJoinRequest())
    @RequireAllPermissions([PatchPermissions.RequestAdmin])
    async confirmRequestToJoinRequest(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Required() @BodyParams('requestId') requestId: string,
        @Required() @BodyParams('userId') userId: string,
        @Required() @BodyParams('positionId') positionId: string
    ) {
        const res = await this.db.confirmRequestToJoinPosition(requestId, user.id, userId, positionId);

        await this.pubSub.sys(PatchEventType.RequestRespondersAccepted, {
            accepterId: user.id,
            responderId: userId,
            requestId,
            positionId,
            orgId
        })

        return this.db.fullHelpRequest(res);
    }

    @Post(API.server.declineRequestToJoinRequest())
    @RequireAllPermissions([PatchPermissions.RequestAdmin])
    async declineRequestToJoinRequest(
        @OrgId() orgId: string, 
        @User() user: UserDoc,
        @Required() @BodyParams('requestId') requestId: string,
        @Required() @BodyParams('userId') userId: string,
        @Required() @BodyParams('positionId') positionId: string
    ) {
        const res = await this.db.declineRequestToJoinPosition(requestId, user.id, userId, positionId);

        await this.pubSub.sys(PatchEventType.RequestRespondersDeclined, {
            declinerId: user.id,
            responderId: userId,
            requestId,
            positionId,
            orgId
        })

        return this.db.fullHelpRequest(res);
    }

    @Post(API.server.removeUserFromRequest())
    @RequireAllPermissions([PatchPermissions.RequestAdmin])
    async removeUserFromRequest(
        @OrgId() orgId: string, 
        @User() user: UserDoc,
        @Required() @BodyParams('userId') userId: string,
        @Required() @BodyParams('requestId') requestId: string, 
        @Required() @BodyParams('positionId') positionId: string, 
    ) {
        const res = await this.db.removeUserFromRequest(user.id, userId, requestId, positionId);

        await this.pubSub.sys(PatchEventType.RequestRespondersRemoved, {
            removerId: user.id,
            responderId: userId,
            requestId,
            positionId,
            orgId
        })

        return this.db.fullHelpRequest(res);
    }

    @Post(API.server.ackRequestsToJoinNotification())
    @RequireAllPermissions([PatchPermissions.RequestAdmin])
    async ackRequestsToJoinNotification(
        @OrgId() orgId: string, 
        @User() user: UserDoc,
        @Required() @BodyParams('requestId') requestId: string,
        @Required() @BodyParams('joinRequests') joinRequests: { userId: string, positionId: string }[],
    ) {
        const res = await this.db.ackRequestsToJoinNotification(requestId, user.id, joinRequests);

        await this.pubSub.sys(PatchEventType.RequestRespondersRequestToJoinAck, {
            requestId,
            orgId,
            joinRequests
        })

        return this.db.fullHelpRequest(res);
    }
}