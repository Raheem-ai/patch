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

    // @Post(API.server.broadcastRequest())
    // @RequireRoles([UserRole.Dispatcher])
    // async broadcastRequest(
    //     @OrgId() orgId: string, 
    //     @User() user: UserDoc,
    //     @Required() @BodyParams('requestId') requestId: string, 
    //     @Required() @BodyParams('to') to: string[]
    // ) {
    //     // TODO: should we keep track of who you have assigned this to?
    //     const usersToAssign = await this.db.getUsersByIds(to);

    //     const notifications: NotificationMetadata<PatchEventType.BroadCastedIncident>[] = [];

    //     for (const user of usersToAssign) {

    //         if (!user.push_token) {
    //             // TODO: what do we do when someone doesn't accept push tokens but we assign to them?
    //             continue;
    //         }

    //         notifications.push({
    //             type: PatchEventType.BroadCastedIncident,
    //             to: user.push_token,
    //             body: `You've been broadcasted HelpRequest ${requestId}`,
    //             payload: {
    //                 id: '1234',
    //                 orgId
    //             }
    //         });
    //     }

    //     await this.notifications.sendBulk(notifications);
    // }

    @Post(API.server.notifyRespondersAboutRequest())
    @RequireRoles([UserRole.Dispatcher])
    async notifyRespondersAboutRequest(
        @OrgId() orgId: string, 
        @User() user: UserDoc,
        @Required() @BodyParams('requestId') requestId: string, 
        @Required() @BodyParams('to') to: string[]
    ) {
        // const usersToAssign = await this.db.getUsersByIds(to);
        const request = await this.db.resolveRequest(requestId)

        // const notifications: NotificationMetadata<PatchEventType.RequestRespondersNotified>[] = [];

        // for (const user of usersToAssign) {

        //     if (!user.push_token) {
        //         // TODO: what do we do when someone doesn't accept push tokens but we assign to them?
        //         continue;
        //     }

        //     notifications.push({
        //         // TODO: update to this type to be about Requests needing help
        //         to: user.push_token,
        //         body: `Help is needed with Request: ${request.displayId}`,
        //         payload: {
        //             event: PatchEventType.RequestRespondersNotified,
        //             params: {
        //                 requestId
        //             }
        //         }
        //     });
        // }
        
        // await this.notifications.sendBulk(notifications);

        const updatedReq = await this.db.notifyRespondersAboutRequest(requestId, user.id, to);

        // await this.socket.handleRespondersNotified({
        //     requestId,
        //     notifierId: user.id,
        //     userIds: to
        // })

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

        // TODO: send notification to user that their request has veen confirmed
        // TODO update the pubsub system with this event
        // await this.pubSub.sys(PatchEventType.RequestRespondersAccepted, {
        //     responderId: user.id,
        //     requestId
        // })

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

        // TODO: send notification to user that their request has been denied
        // TODO update the pubsub system with this event
        // await this.pubSub.sys(PatchEventType.RequestRespondersDeclined, {
        //     responderId: user.id,
        //     requestId
        // })

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

        // TODO: send notification to user that has been removed
        // TODO update the pubsub system with this event
        // await this.pubSub.sys(PatchEventType.RequestRespondersRemoved, {
        //     responderId: userId,
        //     requestId
        // })

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

        // TODO: send notification to user that has been removed
        // TODO update the pubsub system with this event
        // await this.pubSub.sys(PatchEventType.RequestRespondersRemoved, {
        //     responderId: userId,
        //     requestId
        // })

        return res;
    }
}