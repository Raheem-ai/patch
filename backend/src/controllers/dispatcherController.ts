import { BodyParams, Controller, HeaderParams, Inject, Post, Req } from "@tsed/common";
import { MongooseModel } from "@tsed/mongoose";
import API from 'common/api';
import { PatchEventType, UserRole } from "common/models";
import { RequireRoles } from "../middlewares/userRoleMiddleware";
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
    @RequireRoles([UserRole.Dispatcher])
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

        return updatedReq
    }

    @Post(API.server.confirmRequestToJoinRequest())
    @RequireRoles([UserRole.Dispatcher])
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

        return res;
    }

    @Post(API.server.declineRequestToJoinRequest())
    @RequireRoles([UserRole.Dispatcher])
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

        return res;
    }

    @Post(API.server.removeUserFromRequest())
    @RequireRoles([UserRole.Dispatcher])
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

        return res;
    }

    @Post(API.server.ackRequestsToJoinNotification())
    @RequireRoles([UserRole.Dispatcher])
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

        return res;
    }
}