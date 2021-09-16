import { Model, ObjectID } from "@tsed/mongoose";
import { CollectionOf, Enum, MapOf, Property } from "@tsed/schema";
import { User, UserRole } from "common/models";
import { Document } from "mongoose";
import { PrivProps } from ".";

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

    @CollectionOf({
        roles: [UserRole]
    }) 
    organizations: Map<string, {
        roles: UserRole[]
    }>;
    
    @Property()
    name: string;

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
}

export type UserDoc = UserModel & Document;