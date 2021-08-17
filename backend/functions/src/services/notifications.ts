import { NotificationType, NotificationPayload } from "common/models";
import { expo } from "../expo";
import { ExpoPushMessage, ExpoPushErrorReceipt, ExpoPushSuccessTicket, ExpoPushErrorTicket } from 'expo-server-sdk';
import { NotificationModel } from "../models/notification";
import { Inject, Service } from "@tsed/di";
import { MongooseDocumentMethods, MongooseMergedDocument, MongooseModel, MongooseDocument } from "@tsed/mongoose";
import * as uuid from 'uuid';
import { UserModel } from "../models/user";
import { Document } from "mongoose";
import {Agenda, Every, Define} from "@tsed/agenda";
import {Job} from "agenda";
import { JobNames } from "../jobs";

type BulkSaver<T> = {
    // mongoose supports this but their typings are messed up
    bulkSave(docs: MongooseDocument<T>[]): Promise<any>;
}

export type NotificationMetadata<T extends NotificationType> = Omit<NotificationModel<T>, 'id' | 'sent_count'>

@Agenda()
@Service()
export default class Notifications {

    @Inject(NotificationModel) notifications: MongooseModel<NotificationModel> & BulkSaver<NotificationModel>;
    @Inject(UserModel) users: MongooseModel<UserModel> & BulkSaver<NotificationModel>;

    // TODO: this should come from config
    // ((4) + (16) + (4^3) + (4^4) +(4^5))/ 60 ~ 23hrs...so try max 5 times over the course of a day or cleanup with 
    // stale job
    private backOffIncrementInMins = 4;

    async send<T extends NotificationType>(notification: NotificationMetadata<T>): Promise<void> {
        await this.sendBulk([notification])
    }

    async sendBulk<T extends NotificationType>(notifications: NotificationMetadata<T>[]): Promise<void> {
        // convert json obj to mongoose document before sending bulk
        const { successfulSends, failedSends } = await this.sendBulkInternal(notifications.map(n => new this.notifications(n)));

        if (failedSends.length) {
            // handle resolvable errors
            const { transientErrors } = await this.handleNonTransientTicketErrors(failedSends);
            
            // save only transient errors for exponential backoff
            await this.notifications.bulkSave(transientErrors);
        }

        if (successfulSends.length) {
            // save success tickets to check receipts async (every 15 min so this is essentially an enqueue where it checks at longtest 15 min)
            await this.notifications.bulkSave(successfulSends);
        }
    }

    nextSendDate(sentCount: number): Date {
        let nextDate = new Date();
        
        const minsFromLastSend = Math.pow(this.backOffIncrementInMins, sentCount);
        nextDate.setMinutes(nextDate.getMinutes() + minsFromLastSend);

        return nextDate;
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

                // every time this notification is sent this needs to be updated in case either the ticket or recepit
                // comes back with an error
                notification.sent_count = notification.sent_count ? notification.sent_count + 1 : 1;
                notification.next_send = this.nextSendDate(notification.sent_count);
            
                if (ticket.status == 'ok') {
                    notification.success_ticket = ticket;
                    notification.error_ticket = null;
                    successNotifications.push(notification)
                } else {
                    notification.error_ticket = ticket;
                    notification.success_ticket = null;
                    errorNotifications.push(notification)
                }
            });
        }

        return {
            successfulSends: successNotifications,
            failedSends: errorNotifications
        }
    }

    metadataToExpoMessage<T extends NotificationType>(notification: NotificationMetadata<T>): ExpoPushMessage {
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

    async logUnknownTicketError(notification: NotificationModel) {
        // TODO: set this up when we have logging/alerts
    }

    async logUnknownReceiptError(notification: NotificationModel, recepit: ExpoPushErrorReceipt) {
        // TODO: set this up when we have logging/alerts
    }

    async handleNonTransientTicketErrors<N extends MongooseDocument<NotificationModel>>(failedNotifications: N[]): Promise<{ transientErrors: N[], nonTransientErrors: N[] }> {
        // handle resolveable errors ie. user turned off notifications
        const transientErrors = [];
        const nonTransientErrors = [];

        const unregisteredUsers = new Set<string>();

        // only known error we can handle with tickets is when the user unregisters for notifications
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
                default:
                    await this.logUnknownTicketError(failure.toJSON())
                    transientErrors.push(failure);
            }
        }

        return {
            transientErrors,
            nonTransientErrors
        }
    }


    async handleRecepitError(notification: MongooseDocument<NotificationModel>, receipt: ExpoPushErrorReceipt): Promise<boolean> {
        // handle resolveable errors ie. user turned off notifications
            switch (receipt.details.error) {
                case "DeviceNotRegistered":

                    const fullUser = await this.users.findOne({ push_token: notification.to });
                    fullUser.push_token = null;
                    await fullUser.save();

                    return false;
                case "MessageRateExceeded":
                    return true;
                default:
                    await this.logUnknownReceiptError(notification.toJSON(), receipt)
                    return false;
            }
    }

    // TODO: how to schedule exponential backoff for notifications being sent at different times?
    // Answer: add a nextRetry field and change query to only process notifications whos nextRetry is before now
    @Define({ name: JobNames.RetryTransientNotificationFailures })
    async retryTransientFailures(job: Job) {
        // get any notification with an error ticket or receipt that isn't null
        // and who's next scheduled send is before (or) now
        const transientFailures = await this.notifications.find({
            $and: [
                {
                    $or: [
                        {
                            error_ticket: {
                                $exists: true,
                                $ne: null
                            },
                        },
                        {
                            error_receipt: {
                                $exists: true,
                                $ne: null
                            }
                        }
                    ]
                },
                {
                    next_send: {
                        $lte: new Date()
                    }
                }
            ]    
        });

        // new failure/success tickets will be set on the model
        const { successfulSends, failedSends } = await this.sendBulkInternal(transientFailures)

        const { transientErrors, nonTransientErrors } = await this.handleNonTransientTicketErrors(failedSends);

        await this.notifications.bulkSave([
            // remove notifications that were successfully sent from being sent again
            ...successfulSends,
            // update notifications that still have transient errors
            ...transientErrors
        ])

        // TODO: figoure out bulk delete
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

        const receiptToNotificationsMap = new Map<string, MongooseDocument<NotificationModel>>();

        // keep mapping of ticket id and db object
        pendingNotifications.forEach(n => receiptToNotificationsMap.set(n.success_ticket.id, n));

        // should all have an id since these are only the success tickets
        const receiptChunks = expo.chunkPushNotificationReceiptIds(Array.from(receiptToNotificationsMap.keys()))

        const transientErrors: MongooseDocument<NotificationModel>[] = [];
        const notificationsToDelete: MongooseDocument<NotificationModel>[] = [];

        for (const receiptChunk of receiptChunks) {
            const receipts = await expo.getPushNotificationReceiptsAsync(receiptChunk);

            for (let receiptId in receipts) {
                const receipt = receipts[receiptId];
                let { status } = receipt;
                const notification = receiptToNotificationsMap.get(receiptId)

                if (status === 'ok') {
                    // remove ticket from db
                    console.log(`notification ${receiptId} recieved!: `, notification)
                    notificationsToDelete.push(notification)

                    continue;
                } else if (status === 'error') {
                    const errorReceipt = receipt as ExpoPushErrorReceipt;
                    const isTransient = await this.handleRecepitError(notification, errorReceipt);

                    if (isTransient) {
                        // mark as needing to retry
                        notification.error_receipt = errorReceipt;
                        transientErrors.push(notification);
                    } else {
                        notificationsToDelete.push(notification);
                    }
                }
            }
        }

        await this.notifications.bulkSave(transientErrors);
        
        // TODO: figure out bulk delete
        for (const n of notificationsToDelete) {
            await n.delete();
        }
    }
}