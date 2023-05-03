import { Model, Schema } from "@tsed/mongoose";
import { Property } from "@tsed/schema";
import { DynamicAppVersionConfig, DynamicConfig } from "common/models";
import { Collections } from "../common/dbConfig";
import { Document } from "mongoose";

@Schema()
class DynamicAppVersionConfigSchema implements DynamicAppVersionConfig {
    @Property() latestIOS: string
    @Property() latestAndroid: string
    @Property() requiresUpdate: boolean
}

// timestamps are handled by db
@Model({ 
    collection: Collections.DynamicConfig,
    schemaOptions: {
        timestamps: true,
    }
})
export class DynamicConfigModel implements DynamicConfig { 

    @Property()
    appVersion: DynamicAppVersionConfigSchema
}

export type DynamicConfigDoc = DynamicConfigModel & Document;