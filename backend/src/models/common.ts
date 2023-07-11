import { Schema } from "@tsed/mongoose";
import { CollectionOf, Required } from "@tsed/schema";
import { CategorizedItem, CategorizedItemDefinition, Chat, ChatMessage, DateTimeRange, Position } from "common/models";

export function ObjectOf(model) {
    return Schema({
        additionalProperties: model
    });
}

@Schema()
export class CategorizedItemSchema implements CategorizedItem {
    @Required() categoryId: string
    @Required() itemId: string
}

@Schema()
export class CategorizedItemDefinitionSchema implements CategorizedItemDefinition {
    @Required() id: string
    @Required() name: string
}

@Schema()
export class PositionSchema implements Position {
    @Required() id: string
    @Required() role: string
    @Required() min: number
    @Required() max: number

    @CollectionOf(CategorizedItemSchema) attributes: CategorizedItem[]
    @Required() joinedUsers: string[]
}

@Schema()
export class ChatMessageSchema  implements ChatMessage {
    @Required() id: number
    @Required() userId: string
    @Required() message: string
    @Required() timestamp: number
}

@Schema()
export class ChatSchema  implements Chat {
    @Required() id: string
    @Required() @CollectionOf(ChatMessageSchema) messages: ChatMessage[];
    @Required() lastMessageId: number;
    @Required() @CollectionOf(Number) userReceipts: {
        [userId: string]: number;
    };
}

@Schema()
export class DateTimeRangeSchema implements DateTimeRange {
    @Required() startDate: Date;
    @Required() startTime: Date;
    @Required() endDate: Date;
    @Required() endTime: Date;
}
