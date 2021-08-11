import { Model, ObjectID } from "@tsed/mongoose";
import { CollectionOf, Enum, Property } from "@tsed/schema";
import { User, UserRole } from "common/models";


@Model({ collection: 'users' })
export class UserModel implements User {

    // TODO: this type should be constrained to the keys of UserModel so there is no leaks
    static privateProperties = {
        push_token: 0
    }

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

    @Property()
    push_token: string
}
