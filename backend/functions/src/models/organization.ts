import { Model, ObjectID, Ref } from "@tsed/mongoose";
import { Property } from "@tsed/schema";
import { Organization, User } from "common/models";
import { Document } from "mongoose";
import { WithRefs } from ".";
import { UserModel } from './user';

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
}

export type OrganizationDoc = OrganizationModel & Document;