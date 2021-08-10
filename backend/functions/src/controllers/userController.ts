import { BodyParams, Controller, Inject, Post, Req } from "@tsed/common";
import { MongooseModel } from "@tsed/mongoose";
import { Authenticate, Authorize } from "@tsed/passport";
import { Required } from "@tsed/schema";
import API from 'common/api';
import { NotificationType, UserRole } from "common/models";
import { expo } from "../expo";
import { RequireRoles } from "../middlewares/userRoleMiddleware";
import { UserModel } from "../models/user";
import { LocalCredentials } from "../protocols/local";
import { ExpoPushErrorReceipt } from "expo-server-sdk";

@Controller(API.namespaces.users)
export class UsersController {
    @Inject(UserModel) users: MongooseModel<UserModel>;

    @Post(API.server.signUp())
    async signup(
        @Required() @BodyParams() credentials: LocalCredentials
    ) {
        const existingUsers = await this.users.find({ email: credentials.email });

        if (existingUsers && existingUsers.length) {
            // TODO: should this throw for a notification in the ui?
            return existingUsers[0].toJSON()
        } else {
            const user = new this.users(credentials);
            await user.save()

            return user.toJSON()
        }
    }

    @Post(API.server.signIn())
    @Authenticate("login")
    login() {
        // FACADE
        // sets up session cookie and returns user json
    }
    
    @Post(API.server.signOut())
    logout(@Req() req: Req) {
        req.logout();
        req.session.destroy(() => {});
    }

    @Post(API.server.reportLocation())
    @RequireRoles([UserRole.Responder])
    reportLocation(
        @Required() @BodyParams('locations') locations: Location[]
    ) {
        console.log(locations)
    }

    @Post(API.server.reportPushToken())
    @Authorize()
    async reportPushToken(
        @Required() @BodyParams('token') token: string
    ) {
            const chunks = expo.chunkPushNotifications([{
                to: token,
                sound: 'default',
                body: 'This is a test notification',
                data: { 
                    type: NotificationType.AssignedIncident,
                    withSome: 'data' 
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