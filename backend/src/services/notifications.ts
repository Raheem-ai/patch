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
import { DBManager } from "./dbManager";

export type NotificationMetadata<T extends NotificationType> = Omit<NotificationModel<T>, 'sent_count'>

@Agenda()
@Service()
export default class Notifications {

    @Inject(NotificationModel) notifications: MongooseModel<NotificationModel>;
    @Inject(DBManager) db: DBManager;

    // TODO: this should come from config
    // ((4) + (16) + (4^3) + (4^4) + (4^5))/ 60 ~ 23hrs...so try max 5 times over the course of a day or cleanup with 
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
            await this.bulkUpsert(transientErrors);
        }

        if (successfulSends.length) {
            // save success tickets to check receipts async (every 15 min so this is essentially an enqueue where it checks at longtest 15 min)
            await this.bulkUpsert(successfulSends);
        }
    }

    nextSendDate(sentCount: number): Date {
        let nextDate = new Date();
        
        const minsFromLastSend = Math.pow(this.backOffIncrementInMins, sentCount);
        nextDate.setMinutes(nextDate.getMinutes() + minsFromLastSend);

        return nextDate;
    }

    // only deals with documents
    private async sendBulkInternal<T extends NotificationType, N extends NotificationModel<T>>(notifications: N[]): Promise<{ successfulSends: N[], failedSends: N[] }> {
        const chunks = expo.chunkPushNotifications(notifications.map(this.metadataToExpoMessage));

        const successNotifications: N[] = [];
        const errorNotifications: N[] = [];

        let i = 0;

        for (const chunk of chunks) {
            (await expo.sendPushNotificationsAsync(chunk)).forEach(ticket => {
                const notification = notifications[i];

                // every time this notification is sent this needs to be updated in case either the ticket or recepit
                // comes back with an error
                notification.sent_count = notification.sent_count ? notification.sent_count + 1 : 1;
                notification.next_send = this.nextSendDate(notification.sent_count);
            
                if (ticket.status == 'ok') {
                    notification.success_ticket = ticket;
                    // make sure this doesn't retry because of old error ticket
                    notification.error_ticket = null;
                    // make sure this doesn't retry because of old error_receipt
                    notification.error_receipt = null;
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
        // TODO: test which one of these is right when we can actually test background notifs
        return {
            to: notification.to,
            sound: 'default',
            body: notification.body,
            data: {
                ...notification.payload,
                type: notification.type,
                "content-available": 1
            },
            categoryId: notification.type,
            "content-available": 1
        } as any; // expo allows for category id but their types arent up to date
    }

    async logUnknownTicketError(notification: NotificationModel) {
        // TODO: set this up when we have logging/alerts
        console.error(notification);
    }

    async logUnknownReceiptError(notification: NotificationModel, recepit: ExpoPushErrorReceipt) {
        // TODO: set this up when we have logging/alerts
        console.error(notification)
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

                    const fullUser = await this.db.getUser({ push_token: failure.to });
                    fullUser.push_token = null;
                    await fullUser.save();

                    unregisteredUsers.add(failure.to);
                    nonTransientErrors.push(failure);
                // TODO:
                // the docs only mention DeviceNotRegistered for tickets 
                // but the typings have ticket/receipt errors having the same type so they may not all be transient
                // will have to investigate when we can force failed tickets
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

                    const fullUser = await this.db.getUser({ push_token: notification.to });
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

    async bulkUpsert(docs: MongooseDocument<NotificationModel>[]) {
        await this.db.bulkUpsert(this.notifications, docs);
    }

    async bulkDelete(docs: MongooseDocument<NotificationModel>[]) {
        await this.db.bulkDelete(this.notifications, docs)
    }

    @Every('5 minutes', { name: JobNames.RetryTransientNotificationFailures })
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

        if (!transientFailures.length) {
            console.log('No new transient errors to retry')
            return;
        }

        // new failure/success tickets will be set on the model
        const { successfulSends, failedSends } = await this.sendBulkInternal(transientFailures)

        const { transientErrors, nonTransientErrors } = await this.handleNonTransientTicketErrors(failedSends);

        await this.bulkUpsert([
            // remove notifications that were successfully sent from being sent again
            ...successfulSends,
            // update notifications that still have transient errors
            ...transientErrors
        ])

        // delete non transient errors that have been handled 
        await this.bulkDelete(nonTransientErrors);
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
    
    @Every('10 minutes', { name: JobNames.CheckNotificationReceipts })
    async checkReceipts(job: Job) {
        const pendingNotifications = await this.notifications.find({
            success_ticket: {
                $exists: true,
                $ne: null
            }
        });

        if (!pendingNotifications.length) {
            console.log('no new pending notifications to check')
            return;
        }

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

        await this.bulkUpsert(transientErrors);
        
        await this.bulkDelete(notificationsToDelete);
    }

    // @Every('30 seconds')
    // async sendBackgroundNotification(job: Job) {
    //     const user = await this.db.getUser({ email: 'Test@test.com' });
    //     await this.send({
    //         type: NotificationType.AssignedIncident,
    //         to: user.push_token,
    //         body: `You've been assigned to Incident #1234`,
    //         payload: {
    //             id: '1234',
    //         }
    //     })
    // }

    // TODO: use this as a basis for testing down the line 
    // async populateFailedNotifications() {
    //     const user = await this.db.getUser({ email: 'Test@test.com' });

    //     const notifications: NotificationModel[] = [{
    //         // should retry sending on first round of job
    //     //     type: NotificationType.AssignedIncident,
    //     //     to: user.push_token,
    //     //     body: `TRANSIENT TICKET: should retry sending on first round of job`,
    //     //     payload: {
    //     //         id: '1234'
    //     //     },
    //     //     sent_count: 1, 
    //     //     next_send: this.nextSendDate(1),
    //     //     error_ticket: {
    //     //         message: '',
    //     //         status: 'error',
    //     //         details: {
    //     //             error: 'MessageRateExceeded'
    //     //         }
    //     //     }
    //     // }, 
    //     // {
    //     //     // should retry sending on second round of job
    //     //     type: NotificationType.AssignedIncident,
    //     //     to: user.push_token,
    //     //     body: `TRANSIENT TICKET: should retry sending on second round of job`,
    //     //     payload: {
    //     //         id: '2345'
    //     //     },
    //     //     sent_count: 2, 
    //     //     next_send: this.nextSendDate(2),
    //     //     error_ticket: {
    //     //         message: '',
    //     //         status: 'error',
    //     //         details: {
    //     //             error: 'MessageRateExceeded'
    //     //         }
    //     //     }
    //     // },
    //     // {
    //         // should retry sending on first round of job
            // type: NotificationType.AssignedIncident,
            // to: user.push_token,
            // body: `TRANSIENT RECEIPT: should retry sending on first round of job`,
            // payload: {
            //     id: '3456'
            // },
            // sent_count: 1, 
            // next_send: this.nextSendDate(1),
            // error_receipt: {
            //     message: '',
            //     status: 'error',
            //     details: {
            //         error: 'MessageRateExceeded'
            //     }
            // }
    //     // },  
    //     // {
    //     //     // should log and delete
    //     //     type: NotificationType.AssignedIncident,
    //     //     to: user.push_token,
    //     //     body: `should log and delete`,
    //     //     payload: {
    //     //         id: '5678'
    //     //     },
    //     //     sent_count: 1, 
    //     //     next_send: this.nextSendDate(1),
    //     //     error_ticket: {
    //     //         message: '',
    //     //         status: 'error',
    //     //         details: {
    //     //             error: 'MessageTooBig'
    //     //         }
    //     //     }
        // }];

        // await this.bulkUpsert(notifications.map(n => new this.notifications(n)));
    // }
}