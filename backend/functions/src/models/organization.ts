import { Model, ObjectID, Ref } from "@tsed/mongoose";
import { Property } from "@tsed/schema";
import { Organization, User } from "common/models";
import { WithRefs } from ".";
import { UserModel } from './user';

@Model({ collection: 'organizations' })
export class OrganizationModel implements WithRefs<Organization, 'members'> {

    id: string; // for types

    @ObjectID('id')
    _id: string;

    @Property() 
    name: string;

    @Ref(UserModel) 
    members: Ref<UserModel>[];
}