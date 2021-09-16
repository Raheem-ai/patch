import { Model, ObjectID, Ref, Schema } from "@tsed/mongoose";
import { CollectionOf, Enum, getJsonSchema, Property, Required } from "@tsed/schema";
import { ChatMessage, HelpRequest, Location, Organization, RequestSkill, RequestStatus, RequestType, User } from "common/models";
import { Document } from "mongoose";
import { inspect } from "util";
import { WithRefs } from ".";
import { UserModel } from './user';

@Schema()
class ChatMessageSchema  implements ChatMessage {
    @Required() userId: string
    @Required() message: string
    @Required() timestamp: number
}

@Model({ collection: 'help_requests' })
export class HelpRequestModel implements HelpRequest {

    id: string; // for types

    @ObjectID('id')
    _id: string;

    @Property()
    orgId: string

    @Property()
    location: Location

    @Enum(RequestType)
    type: RequestType

    @Property()
    notes: string

    @Enum(RequestSkill)
    skills: RequestSkill[]

    @Property()
    // otherRequirements?: any 

    @Property()
    respondersNeeded: number

    @CollectionOf(ChatMessageSchema)
    chat: ChatMessage[]

    @Property()
    dispatcherId: string

    @CollectionOf(String)
    responderIds: string[]

    @Enum(RequestStatus) 
    status: RequestStatus

}

export type HelpRequestDoc = HelpRequestModel & Document;