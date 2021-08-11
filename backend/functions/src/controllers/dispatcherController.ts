import { Controller, Inject, Post, Req } from "@tsed/common";
import { MongooseModel } from "@tsed/mongoose";
import API from 'common/api';
import { NotificationType, User, UserRole } from "common/models";
import { RequireRoles } from "../middlewares/userRoleMiddleware";
import { UserModel } from "../models/user";
import { ExpoPushErrorReceipt } from "expo-server-sdk";
import { expo } from "../expo";


@Controller(API.namespaces.dispatch)
export class DispatcherController {
    @Inject(UserModel) users: MongooseModel<UserModel>;

    @Post(API.server.dispatch())
    @RequireRoles([UserRole.Dispatcher])
    async dispatch() {
        console.log('dispatch')
    }

    @Post(API.server.assignIncident())
    @RequireRoles([UserRole.Dispatcher])
    async assignIncident(
        @Req() request: Req
    ) {
        const fullUser = await this.users.findOne({ email: (request.user as User).email })

        if (!fullUser.push_token) {
            // TODO: what do we do when someone doesn't accept push tokens but we assign to them?
            return;
        }

        const chunks = expo.chunkPushNotifications([{
            to: fullUser.push_token,
            sound: 'default',
            body: `You've been assigned to Incident #1234`,
            data: { 
                type: NotificationType.AssignedIncident,
                location: {
                    lat: 12345,
                    long: 67890
                } 
            },
        }]);

        const tickets = [];

        for (const chunk of chunks) {
            tickets.push(...await expo.sendPushNotificationsAsync(chunk));
        }   

        const receiptChunks = expo.chunkPushNotificationReceiptIds(tickets.filter(t => !!t.id).map(t => t.id))

        for (const receiptChunk of receiptChunks) {
            const receipts = await expo.getPushNotificationReceiptsAsync(receiptChunk);

            for (let receiptId in receipts) {
                const receipt = receipts[receiptId];
                let { status } = receipt;

                if (status === 'ok') {
                    continue;
                } else if (status === 'error') {
                    let { details, message } = receipt as ExpoPushErrorReceipt;

                    console.error(
                        `There was an error sending a notification: ${message}`
                    );

                    if (details && details.error) {
                        // The error codes are listed in the Expo documentation:
                        // https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
                        // You must handle the errors appropriately.
                        console.error(`The error code is ${details.error}`);
                    }
                }
            }
        }
    }

}