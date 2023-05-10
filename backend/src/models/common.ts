import { Schema } from "@tsed/mongoose";
import { CollectionOf, Required } from "@tsed/schema";
import { CategorizedItem, CategorizedItemDefinition, Position } from "common/models";

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