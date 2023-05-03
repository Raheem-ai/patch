import { Model } from "@tsed/mongoose";
import { Property } from "@tsed/schema";
import { AuthCode } from "common/models";
import { Collections } from "../common/dbConfig";
import { Document } from "mongoose";

// timestamps are handled by db
@Model({ 
    collection: Collections.AuthCode,
    schemaOptions: {
        timestamps: true
    }
})
export class AuthCodeModel implements AuthCode { 

    @Property()
    code: string

    @Property()
    userId: string

    @Property()
    createdAt: string
}

export type AuthCodeDoc = AuthCodeModel & Document;