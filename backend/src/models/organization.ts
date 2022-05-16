import { Model, ObjectID, Ref, Schema } from "@tsed/mongoose";
import { CollectionOf, Property, Required } from "@tsed/schema";
import { Organization, PendingUser, RequestSkill, User, UserRole, Role, AttributeCategory, TagCategory, AttributesMap, CategorizedItem } from "common/models";
import { Document } from "mongoose";
import { WithRefs } from ".";
import { UserModel } from './user';

@Schema()
class PendingUserSchema  implements PendingUser {
    @Required() email: string
    @Required() phone: string
    @Required() roles: UserRole[]
    @Required() roleIds: string[]
    @Required() attributes: CategorizedItem[]
    @Required() skills: RequestSkill[]
    @Required() pendingId: string
}

@Model({ collection: 'organizations' })
export class OrganizationModel implements WithRefs<Organization, 'members' | 'removedMembers'> {

    id: string; // for types

    @ObjectID('id')
    _id: string;

    @Property() 
    name: string;

    @Property()
    roleDefinitions: Role[];

    @Property()
    attributeCategories: AttributeCategory[];

    @Property()
    tagCategories: TagCategory[];

    @Property()
    lastRequestId: number;

    @Property()
    lastDayTimestamp: string;

    @Ref(UserModel) 
    members: Ref<UserModel>[];

    @Ref(UserModel) 
    removedMembers: Ref<UserModel>[];

    @CollectionOf(PendingUserSchema)
    pendingUsers: PendingUser[]
}

export type OrganizationDoc = OrganizationModel & Document;