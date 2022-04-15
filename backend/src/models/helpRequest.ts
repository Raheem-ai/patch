import { Model, ObjectID, Ref, Schema } from "@tsed/mongoose";
import { CollectionOf, Enum, getJsonSchema, Property, Required } from "@tsed/schema";
import { AddressableLocation, Chat, ChatMessage, HelpRequest, HelpRequestAssignment, Location, Organization, RequestSkill, RequestStatus, RequestType, TagsMap, User } from "common/models";
import { Document } from "mongoose";
// import { inspect } from "util";
// import { WithRefs } from ".";
// import { UserModel } from './user';
// import utils from 'util'

@Schema()
class ChatMessageSchema  implements ChatMessage {
    @Required() id: number
    @Required() userId: string
    @Required() message: string
    @Required() timestamp: number
}

@Schema()
class HelpRequestAssignmentSchema implements HelpRequestAssignment {
    @Required() timestamp: number
    @Required() responderIds: string[]
}

@Model({ 
    collection: 'help_requests',
    schemaOptions: {
        timestamps: true
    }
})
export class HelpRequestModel implements HelpRequest {

    // handled by mongo but here for types
    id: string; 
    createdAt: string;
    updatedAt: string;

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

    @Enum(RequestSkill)
    skills: RequestSkill[]

    @Property()
    tags: TagsMap

    @Property()
    // otherRequirements?: any 

    @Property()
    respondersNeeded: number

    @Property({
        id: String,
        messages: [ChatMessageSchema],
        lastChatId: Number,
        userRecepits: Object
    })
    chat: Chat

    @Property()
    dispatcherId: string

    @CollectionOf(String)
    assignedResponderIds: string[]

    @CollectionOf(String)
    declinedResponderIds: string[]
    
    // @CollectionOf(String)
    // removedResponderIds: string[]

    @CollectionOf(HelpRequestAssignmentSchema)
    assignments: HelpRequestAssignment[]

    @Enum(RequestStatus) 
    status: RequestStatus

}

export type HelpRequestDoc = HelpRequestModel & Document;

// console.log(utils.inspect(getJsonSchema(HelpRequestModel), null, 4))