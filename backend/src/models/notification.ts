import { Model, ObjectID } from "@tsed/mongoose";
import { Property } from "@tsed/schema";
import { PatchEventPacket, PatchEventType } from "common/models";
import { ExpoPushSuccessTicket, ExpoPushErrorTicket, ExpoPushErrorReceipt } from 'expo-server-sdk';

@Model({ collection: 'notifications' })
export class NotificationModel<T extends PatchEventType = any> {

    @Property()
    payload: PatchEventPacket<T>

    @Property()
    to: string

    @Property()
    body: string

    @Property()
    success_ticket?: ExpoPushSuccessTicket;

    @Property()
    error_ticket?: ExpoPushErrorTicket;

    @Property()
    error_receipt?: ExpoPushErrorReceipt;

    @Property() 
    sent_count: number;

    @Property()
    next_send?: Date;
}
