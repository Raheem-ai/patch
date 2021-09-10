import { Controller, Inject, Post, Req } from "@tsed/common";
import { MongooseModel } from "@tsed/mongoose";
import API from 'common/api';
import { NotificationType, User, UserRole } from "common/models";
import { RequireRoles } from "../middlewares/userRoleMiddleware";
import { UserModel } from "../models/user";
import { ExpoPushErrorReceipt, ExpoPushSuccessTicket, ExpoPushErrorTicket } from "expo-server-sdk";
import { expo } from "../expo";
import Notifications from '../services/notifications';

@Controller(API.namespaces.dispatch)
export class DispatcherController {
    @Inject(UserModel) users: MongooseModel<UserModel>;
    @Inject(Notifications) notifications: Notifications;

    @Post(API.server.broadcastRequest())
    @RequireRoles([UserRole.Dispatcher])
    async broadcastRequest() {
        console.log('broadcastRequest')
    }

    @Post(API.server.assignRequest())
    @RequireRoles([UserRole.Dispatcher])
    async assignRequest(
        @Req() request: Req
    ) {
        const fullUser = await this.users.findOne({ email: (request.user as User).email })

        if (!fullUser.push_token) {
            // TODO: what do we do when someone doesn't accept push tokens but we assign to them?
            return;
        }

        await this.notifications.send({
            type: NotificationType.AssignedIncident,
            to: fullUser.push_token,
            body: `You've been assigned to Incident #1234`,
            payload: {
                id: '1234'
            }
        });
    }

}