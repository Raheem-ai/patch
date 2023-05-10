import { Model, ObjectID, Schema } from "@tsed/mongoose";
import { CollectionOf, Enum, Property, Required } from "@tsed/schema";
import { AddressableLocation, CategorizedItem, Chat, ChatMessage, HelpRequest, Position, RequestPriority, RequestStatus, RequestTeamEvent, RequestType, RequestStatusEvent, Shift, RecurringDateTimeRange, ShiftOccurrence } from "common/models";
import { Document } from "mongoose";
import { PositionSchema } from "./common";

// timestamps are handled by db
@Model({ 
    collection: 'shifts',
    schemaOptions: {
        timestamps: true
    }
})

export class ShiftModel implements Omit<Shift, 'createdAt' | 'updatedAt'> {
    // handled by mongo but here for types
    id: string; 

    @ObjectID('id')
    _id: string;

    @Property()
    displayId: string;

    @Property()
    orgId: string;

    @CollectionOf(PositionSchema)
    positions: Position[];

    @Property()
    title: string;

    @Property()
    description: string;

    @Property()
    recurrence: RecurringDateTimeRange;

    @Property()
    occurrenceDiffs: { [occurenceId: string]: ShiftOccurrence; };
}

export type ShiftDoc = ShiftModel & Document;