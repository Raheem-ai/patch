import { Model, ObjectID, Schema } from "@tsed/mongoose";
import { CollectionOf, Enum, getJsonSchema, MapOf, Property } from "@tsed/schema";
import { CategorizedItem, RequestSkill, User, UserRole } from "common/models";
import { Document } from "mongoose";
import { PrivProps } from ".";
import utils from 'util'

@Model({ collection: 'users' })
export class UserModel implements User {

    static systemProperties: PrivProps<UserModel> = {
        push_token: 0,
        password: 0,
        auth_etag: 0,
    }

    static personalProperties: PrivProps<UserModel> = {
        // placeholder for future props that would go in 
        // a profile but not be visible to orgs looking at their member
        race: 0
    }

    id: string; // for types

    @ObjectID('id')
    _id: string;

    @Property()
    organizations: { [key: string]:  {
            roleIds: string[],
            attributes: CategorizedItem[],
            onDuty: boolean
        }
    }
    
    @Property()
    name: string;

    @Property()
    phone: string;

    @Property()
    email: string;

    @Property()
    password: string;

    @Property()
    push_token: string

    @Property()
    auth_etag: string

    @Property()
    race?: string

    @Property()
    bio?: string

    @Property()
    pronouns?: string

    @Property()
    displayColor: string

    @Enum(RequestSkill)
    skills: RequestSkill[]
}

export type UserDoc = UserModel & Document;

console.log(utils.inspect(getJsonSchema(UserModel), null, 6))