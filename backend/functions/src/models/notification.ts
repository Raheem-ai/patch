import { Model, ObjectID } from "@tsed/mongoose";
import { Property } from "@tsed/schema";
import { NotificationPayload, NotificationType } from "common/models";
import { ExpoPushSuccessTicket, ExpoPushErrorTicket } from 'expo-server-sdk';

@Model({ collection: 'notifications' })
export class NotificationModel<T extends NotificationType = any> {

    @ObjectID('id')
    id: string;

    @Property()
    type: T

    @Property()
    payload: NotificationPayload<T>

    @Property()
    to: string

    @Property()
    body: string

    @Property()
    success_ticket?: ExpoPushSuccessTicket;

    @Property()
    error_ticket?: ExpoPushErrorTicket;
}
