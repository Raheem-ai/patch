import { Model, ObjectID, Ref, Schema } from "@tsed/mongoose";
import { CollectionOf, Property, Required } from "@tsed/schema";
import { Organization, PendingUser, User, UserRole } from "common/models";
import { Document } from "mongoose";
import { WithRefs } from ".";
import { UserModel } from './user';

@Schema()
class PendingUserSchema  implements PendingUser {
    @Required() email: string
    @Required() phone: string
    @Required() roles: UserRole[]
    @Required() pendingId: string
}

@Model({ collection: 'organizations' })
export class OrganizationModel implements WithRefs<Organization, 'members'> {

    id: string; // for types

    @ObjectID('id')
    _id: string;

    @Property() 
    name: string;

    @Property()
    lastRequestId: number;

    @Property()
    lastDayTimestamp: string;

    @Ref(UserModel) 
    members: Ref<UserModel>[];

    @CollectionOf(PendingUserSchema)
    pendingUsers: PendingUser[]
}

export type OrganizationDoc = OrganizationModel & Document;