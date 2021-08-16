import { NotificationType, NotificationPayload } from "common/models";
import { expo } from "../expo";
import { ExpoPushMessage, ExpoPushErrorReceipt, ExpoPushSuccessTicket, ExpoPushErrorTicket } from 'expo-server-sdk';
import { NotificationModel } from "../models/notification";
import { Inject, Service } from "@tsed/di";
import { MongooseDocumentMethods, MongooseMergedDocument, MongooseModel } from "@tsed/mongoose";
import * as uuid from 'uuid';
import { UserModel } from "../models/user";
import { Document } from "mongoose";
import {Agenda, Every, Define} from "@tsed/agenda";
import {Job} from "agenda";
import { JobNames } from "../jobs";

type BulkSaver<T> = {
    bulkSave(docs: T[]): Promise<any>;
}

@Agenda()
@Service()
export default class Notifications {

    @Inject(NotificationModel) notifications: MongooseModel<NotificationModel> & BulkSaver<NotificationModel>;
    @Inject(UserModel) users: MongooseModel<UserModel> & BulkSaver<NotificationModel>;

    async send<T extends NotificationType>(notification: Omit<NotificationModel<T>, 'id'>): Promise<void> {
        await this.sendBulk([notification])
    }

    async sendBulk<T extends NotificationType>(notifications: Omit<NotificationModel<T>, 'id'>[]): Promise<void> {
        // convert json obj to mongoose document before sending bulk
        const { successfulSends, failedSends } = await this.sendBulkInternal(notifications.map(n => new this.notifications(n)));

        if (failedSends.length) {
            // handle resolvable errors
            const { transientErrors } = await this.handleNonTransientFailures(failedSends);
            
            // save only transient errors for exponential backoff
            await this.notifications.bulkSave(transientErrors);
        }

        if (successfulSends.length) {
            // save success tickets to check receipts async (every 15 min so this is essentially an enqueue where it checks at longtest 15 min)
            await this.notifications.bulkSave(successfulSends);
        }
    }

    // only deals with documents
    private async sendBulkInternal<T extends NotificationType, N extends Omit<NotificationModel<T>, 'id'>>(notifications: N[]): Promise<{ successfulSends: (N & { id: string })[], failedSends: (N & { id: string })[] }> {
        const chunks = expo.chunkPushNotifications(notifications.map(this.metadataToExpoMessage));

        const successNotifications: (N & { id: string })[] = [];
        const errorNotifications: (N & { id: string })[] = [];

        let i = 0;

        for (const chunk of chunks) {
            (await expo.sendPushNotificationsAsync(chunk)).forEach(ticket => {
                const notification = notifications[i] as N & { id: string };
                // notification.id =  notification.id || uuid.v1();
            
                if (ticket.status == 'ok') {
                    notification.success_ticket = ticket;
                    successNotifications.push(notification)
                } else {
                    notification.error_ticket = ticket;
                    errorNotifications.push(notification)
                }
            });
        }

        return {
            successfulSends: successNotifications,
            failedSends: errorNotifications
        }
    }

    metadataToExpoMessage<T extends NotificationType>(notification: Omit<NotificationModel<T>, 'id'>): ExpoPushMessage {
        return {
            to: notification.to,
            sound: 'default',
            body: notification.body,
            data: {
                ...notification.payload,
                type: notification.type
            },
            categoryId: notification.type
        } as any; // expo allows for category id but their types arent up to date
    }

    async handleNonTransientFailures<N extends NotificationModel>(failedNotifications: N[]): Promise<{ transientErrors: N[], nonTransientErrors: N[] }> {
        // handle resolveable errors ie. user turned off notifications
        const transientErrors = [];
        const nonTransientErrors = [];

        const unregisteredUsers = new Set<string>();

        for (const failure of failedNotifications) {
            switch (failure.error_ticket.details.error) {
                case "DeviceNotRegistered":
                    if (unregisteredUsers.has(failure.to)) {
                        nonTransientErrors.push(failure);
                        continue;
                    }

                    const fullUser = await this.users.findOne({ push_token: failure.to });
                    fullUser.push_token = null;
                    await fullUser.save();

                    unregisteredUsers.add(failure.to);
                    nonTransientErrors.push(failure);
                case "InvalidCredentials":
                    // TODO: what shoulg go here?!?!
                    nonTransientErrors.push(failure);
                case "MessageRateExceeded":
                    transientErrors.push(failure);
                case "MessageTooBig":
                    // TODO: what shoulg go here?!?!
                    nonTransientErrors.push(failure);
            }
        }

        return {
            transientErrors,
            nonTransientErrors
        }
    }

    // TODO: how to schedule exponential backoff for notifications being sent at different times?
    // Answer: add a nextRetry field and change query to only process notifications whos nextRetry is before now
    @Define({ name: JobNames.RetryTransientNotificationFailures })
    async retryTransientFailures(job: Job) {
        // get any notification with an error ticket that isn't null
        const transientFailures = await this.notifications.find({
            error_ticket: {
                $exists: true,
                $ne: null
            }
        });

        // new failure/success tickets will be set on the model
        const { successfulSends, failedSends } = await this.sendBulkInternal(transientFailures)

        const { transientErrors, nonTransientErrors } = await this.handleNonTransientFailures(failedSends);

        // update notifications that were successfully sent
        for (const success of successfulSends) {
            success.error_ticket = null;
            await success.save();
        }

        // update notifications that still have transient errors
        for (const transientError of transientErrors) {
            await transientError.save();
        }

        // delete non transient errors that have been handled 
        for (const nonTransientError of nonTransientErrors) {
            await nonTransientError.delete()
        }
    }

    @Every('24 hours', { name: JobNames.CleanupStaleNotifications })
    async cleanupStaleNotifications(job: Job) {
        // delete all notifications that are over a day old
        await this.notifications.deleteMany({
            createdAt: {
                // TODO: this should be from config!!!
                $lt: new Date(Date.now() - (1000 * 60 * 60 * 24))
            }
        })
    }
    
    @Every('30 seconds', { name: JobNames.CheckNotificationReceipts })
    async checkReceipts(job: Job) {
        const pendingNotifications = await this.notifications.find({
            success_ticket: {
                $exists: true,
                $ne: null
            }
        });

        const receiptToNotificationsMap = new Map<string, Document<NotificationModel>>();

        // keep mapping of ticket id and db object
        pendingNotifications.forEach(n => receiptToNotificationsMap.set(n.success_ticket.id, n));

        // should all have an id since these are only the success tickets
        const receiptChunks = expo.chunkPushNotificationReceiptIds(Array.from(receiptToNotificationsMap.keys()))

        for (const receiptChunk of receiptChunks) {
            const receipts = await expo.getPushNotificationReceiptsAsync(receiptChunk);

            for (let receiptId in receipts) {
                const receipt = receipts[receiptId];
                let { status } = receipt;

                if (status === 'ok') {
                    // remove ticket from db
                    const notification = receiptToNotificationsMap.get(receiptId);
                    console.log(`notification ${receiptId} recieved!: `, notification)
                    await notification.delete();
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