import { Schema } from "@tsed/mongoose";
import { Required } from "@tsed/schema";
import { CategorizedItem, CategorizedItemDefinition } from "common/models";

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