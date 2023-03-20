import { Model, ObjectID, Ref, Schema } from "@tsed/mongoose";
import { CollectionOf, Enum, getJsonSchema, Property, Required } from "@tsed/schema";
import { Organization, PendingUser, UserRole, Role, AttributeCategory, TagCategory, CategorizedItem, Tag, Attribute, PatchPermissionGroups } from "common/models";
import { Document } from "mongoose";
import { WithRefs } from ".";
import { UserModel } from './user';
import utils from 'util'
import { CategorizedItemDefinitionSchema } from "./common";

@Schema()
class PendingUserSchema  implements PendingUser {
    @Required() email: string
    @Required() phone: string
    @Required() roleIds: string[]
    @Required() attributes: CategorizedItem[]
    @Required() pendingId: string
}

@Schema()
class TagCategorySchema implements TagCategory {
    @Required() id: string
    @Required() name: string
    
    @CollectionOf(CategorizedItemDefinitionSchema)
    tags: Tag[]
}

@Schema()
class AttributeCategorySchema implements AttributeCategory {
    @Required() id: string
    @Required() name: string
    
    @CollectionOf(CategorizedItemDefinitionSchema)
    attributes: Attribute[]
}

@Schema()
class RoleSchema implements Role {
    @Required() id: string
    @Required() name: string
    
    @Enum(PatchPermissionGroups)
    permissionGroups: PatchPermissionGroups[]
}

@Model({ collection: 'organizations' })
export class OrganizationModel implements WithRefs<Organization, 'members' | 'removedMembers'> {

    id: string; // for types

    @ObjectID('id')
    _id: string;

    @Property() 
    name: string;

    @CollectionOf(RoleSchema)
    roleDefinitions: Role[];

    @CollectionOf(AttributeCategorySchema)
    attributeCategories: AttributeCategory[];

    @CollectionOf(TagCategorySchema)
    tagCategories: TagCategory[];

    @Property()
    lastRequestId: number;

    @Property()
    requestPrefix: string;

    @Ref(UserModel) 
    members: Ref<UserModel>[];

    @Ref(UserModel) 
    removedMembers: Ref<UserModel>[];

    @CollectionOf(PendingUserSchema)
    pendingUsers: PendingUser[]
}

export type OrganizationDoc = OrganizationModel & Document;
// console.log(utils.inspect(getJsonSchema(OrganizationModel), null, 6))