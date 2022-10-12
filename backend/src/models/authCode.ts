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
export class AuthCodeModel implements Omit<AuthCode, 'createdAt'> {

    @Property()
    code: string

    @Property()
    userId: string
}

export type AuthCodeDoc = AuthCodeModel & Document;