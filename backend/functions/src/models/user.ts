import { Model, ObjectID } from "@tsed/mongoose";
import { CollectionOf, Enum, Property } from "@tsed/schema";
import { User, UserRole } from "common/models";
import { PrivProps } from ".";

@Model({ collection: 'users' })
export class UserModel implements User {

    static privateProperties: PrivProps<UserModel> = {
        push_token: 0,
        password: 0,
        auth_etag: 0,
        id: 0
    }

    id: string; // for types

    @ObjectID('id')
    _id: string;

    @Enum(UserRole)
    roles: UserRole[];
    
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
}
