import { Model, ObjectID, Schema } from "@tsed/mongoose";
import { CollectionOf, Enum, Property, Required } from "@tsed/schema";
import { AddressableLocation, CategorizedItem, Chat, ChatMessage, HelpRequest, Position, RequestPriority, RequestStatus, RequestTeamEvent, RequestType, RequestStatusEvent } from "common/models";
import { Document } from "mongoose";
import { Collections } from "../common/dbConfig";
import { CategorizedItemSchema } from "./common";

@Schema()
class ChatMessageSchema  implements ChatMessage {
    @Required() id: number
    @Required() userId: string
    @Required() message: string
    @Required() timestamp: number
}

@Schema()
class ChatSchema  implements Chat {
    @Required() id: string
    @Required() @CollectionOf(ChatMessageSchema) messages: ChatMessage[];
    @Required() lastMessageId: number;
    @Required() @CollectionOf(Number) userReceipts: {
        [userId: string]: number;
    };
}

@Schema()
class PositionSchema implements Position {
    @Required() id: string
    @Required() role: string
    @Required() min: number
    @Required() max: number

    @CollectionOf(CategorizedItemSchema) attributes: CategorizedItem[]
    @Required() joinedUsers: string[]
}

@Schema()
class RequestStatusEventSchema implements RequestStatusEvent {
    @Required() status: RequestStatus
    @Required() setBy: string
    @Required() setAt: string
}

// timestamps are handled by db
@Model({ 
    collection: Collections.HelpRequest,
    schemaOptions: {
        timestamps: true
    }
})
export class HelpRequestModel implements Omit<HelpRequest, 'createdAt' | 'updatedAt'> {
    // handled by mongo but here for types
    id: string; 

    @ObjectID('id')
    _id: string;

    @Property()
    displayId: string
    
    @Property()
    orgId: string

    @Property()
    location: AddressableLocation

    @Enum(RequestType)
    type: RequestType[]

    @Property()
    notes: string

    @Property()
    chat: ChatSchema

    @Property()
    dispatcherId: string

    @Enum(RequestStatus) 
    status: RequestStatus

    @Property()
    callerName: string

    @Property()
    callerContactInfo: string

    @Property()
    callStartedAt: string

    @Property()
    callEndedAt: string

    @Enum(RequestPriority)
    priority: RequestPriority

    @CollectionOf(CategorizedItemSchema)
    tagHandles: CategorizedItem[]

    @CollectionOf(PositionSchema)
    positions: Position[]

    // TODO: is this the right way to do it?
    @CollectionOf(Object)
    teamEvents: RequestTeamEvent[];

    @CollectionOf(RequestStatusEventSchema)
    statusEvents: RequestStatusEvent[];
}

export type HelpRequestDoc = HelpRequestModel & Document;

// console.log(utils.inspect(getJsonSchema(HelpRequestModel), null, 4))