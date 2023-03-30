import { Model, ObjectID } from "@tsed/mongoose";
import { getJsonSchema, MapOf, Property } from "@tsed/schema";
import { CategorizedItem, User } from "common/models";
import { Document } from "mongoose";
import { PrivProps } from ".";
import utils from 'util'
import { Collections } from "../common/dbConfig";

@Model({ collection: Collections.User })
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

    // TODO: figure out how to model this correctly with a schema
    // I think we tried to before and abandoned it
    // @MapOf() maybe?
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

    @Property()
    acceptedTOSVersion: string
}

export type UserDoc = UserModel & Document;

console.log(utils.inspect(getJsonSchema(UserModel), null, 6))