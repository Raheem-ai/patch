import { BodyParams, Controller, HeaderParams, Inject, Post, Req } from "@tsed/common";
import { MongooseModel } from "@tsed/mongoose";
import API from 'common/api';
import { NotificationType, UserRole } from "common/models";
import { RequireRoles } from "../middlewares/userRoleMiddleware";
import { UserDoc, UserModel } from "../models/user";
import { ExpoPushErrorReceipt, ExpoPushSuccessTicket, ExpoPushErrorTicket } from "expo-server-sdk";
import { expo } from "../expo";
import Notifications, { NotificationMetadata } from '../services/notifications';
import { APIController, OrgId } from ".";
import { Required } from "@tsed/schema";
import { User } from "../protocols/jwtProtocol";
import { DBManager } from "../services/dbManager";

@Controller(API.namespaces.dispatch)
export class DispatcherController implements APIController<'broadcastRequest' | 'assignRequest'> {
    @Inject(UserModel) users: MongooseModel<UserModel>;
    
    @Inject(Notifications) notifications: Notifications;
    @Inject(DBManager) db: DBManager;


    @Post(API.server.broadcastRequest())
    @RequireRoles([UserRole.Dispatcher])
    async broadcastRequest(
        @OrgId() orgId: string, 
        @User() user: UserDoc,
        @Required() @BodyParams('requestId') requestId: string, 
        @Required() @BodyParams('to') to: string[]
    ) {
        // TODO: should we keep track of who you have assigned this to?
        const usersToAssign = await this.db.getUsersByIds(to);

        const notifications: NotificationMetadata<NotificationType.BroadCastedIncident>[] = [];

        for (const user of usersToAssign) {

            if (!user.push_token) {
                // TODO: what do we do when someone doesn't accept push tokens but we assign to them?
                continue;
            }

            notifications.push({
                type: NotificationType.BroadCastedIncident,
                to: user.push_token,
                body: `You've been broadcasted HelpRequest ${requestId}`,
                payload: {
                    id: '1234',
                    orgId
                }
            });
        }

        await this.notifications.sendBulk(notifications);
    }

    @Post(API.server.assignRequest())
    @RequireRoles([UserRole.Dispatcher])
    async assignRequest(
        @OrgId() orgId: string, 
        @User() user: UserDoc,
        @Required() @BodyParams('requestId') requestId: string, 
        @Required() @BodyParams('to') to: string[]
    ) {
        const updatedReq = await this.db.assignRequest(requestId, to);
        const usersToAssign = await this.db.getUsersByIds(to);

        const notifications: NotificationMetadata<NotificationType.AssignedIncident>[] = [];

        for (const user of usersToAssign) {

            if (!user.push_token) {
                // TODO: what do we do when someone doesn't accept push tokens but we assign to them?
                continue;
            }

            notifications.push({
                type: NotificationType.AssignedIncident,
                to: user.push_token,
                body: `You've been assigned to HelpRequest ${updatedReq.displayId}`,
                payload: {
                    id: updatedReq.id,
                    orgId: updatedReq.orgId
                }
            });
        }

        await this.notifications.sendBulk(notifications);

        return updatedReq
    }

}