import { Model, ObjectID, Schema, getSchema } from "@tsed/mongoose";
import { CollectionOf, Property, Required, RecordOf, getJsonSchema, OneOf, Enum, number } from "@tsed/schema";
import { Position, Shift, RecurringDateTimeRange, ShiftOccurrence, Chat, DateTimeRange, RecurringTimePeriod, RecurringPeriod } from "common/models";
import { Document } from "mongoose";
import { ChatSchema, DateTimeRangeSchema, ObjectOf, PositionSchema } from "./common";
import utils from 'util'

// node_modules/@tsed/schema/lib/esm/decorators/common/recordOf.js
@Schema()
class RecurringTimePeriodSchemaMonthly  {
    @Property() numberOf: number;
    @Enum(RecurringPeriod) period: RecurringPeriod.Month;
    @Property() dayScope?: boolean;
    @Property() weekScope?: boolean;
}

@Schema()
class RecurringTimePeriodSchemaWeekly  {
    @Property() numberOf: number;
    @Enum(RecurringPeriod) period: RecurringPeriod.Week;
    @CollectionOf(number) days: number[];
}

@Schema()
class RecurringTimePeriodSchemaDaily  {
    @Property() numberOf: number;
    @Enum(RecurringPeriod) period: RecurringPeriod.Day;
}

@Schema()
class RecurringDateTimeRangeSchema implements RecurringDateTimeRange {
    @Required() startDate: Date;
    @Required() endDate: Date;
    @OneOf([RecurringTimePeriodSchemaMonthly, RecurringTimePeriodSchemaWeekly, RecurringTimePeriodSchemaDaily])
    every?: RecurringTimePeriod;
    @Property() until?: { 
        date: Date;
        repititions: null;
    } | { 
        date: null;
        repititions: number;
    };
}

@Schema()
class ShiftOccurrenceSchema  implements ShiftOccurrence {
    @Required() id: string;
    @Required() shiftId: string;
    @Required() @Property(ChatSchema) chat: Chat;
    @Property(DateTimeRangeSchema) dateTimeRange?: DateTimeRange;
    // TODO: No longer optional
    @Property() title?: string;
    @Property() description?: string;
    @CollectionOf(PositionSchema) positions?: Position[];
}

// type ShiftOccurrenceDiff = Record<string, ShiftOccurrenceSchema>;

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

    @Property(RecurringDateTimeRangeSchema)
    recurrence: RecurringDateTimeRange;

    @ObjectOf(ShiftOccurrenceSchema)
    occurrenceDiffs: { [occurenceId: string]: ShiftOccurrence; };
}

export type ShiftDoc = ShiftModel & Document;

// console.log(utils.inspect(getJsonSchema(ShiftModel), null, 6))