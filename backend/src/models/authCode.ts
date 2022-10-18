import { Model } from "@tsed/mongoose";
import { Property } from "@tsed/schema";
import { AuthCode } from "common/models";

// timestamps are handled by db
@Model({ 
    collection: 'auth_code',
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
    hasBeenUsed: boolean

    @Property()
    createdAt: string
}

export type AuthCodeDoc = AuthCodeModel & Document;