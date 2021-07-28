import { Model, ObjectID } from "@tsed/mongoose";
import { CollectionOf, Enum, Property } from "@tsed/schema";
import { User, UserRole } from "common/models";

@Model({ collection: 'users' })
export class UserModel implements User {
    @ObjectID('id')
    id: string;

    @Enum(UserRole)
    roles: UserRole[];
    
    @Property()
    name: string;

    @Property()
    email: string;

    @Property()
    password: string;
}