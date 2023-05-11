import { Inject, Service } from "@tsed/di";
import { UserModel } from "../models/user";
import { OrganizationModel } from "../models/organization";
import { MongooseService } from "@tsed/mongoose";
import { Document, Model } from "mongoose";
import { HelpRequestModel } from "../models/helpRequest";
import { AuthCodeModel } from "../models/authCode";

import { DBManager } from "../common/dbManager";
import { DynamicConfigModel } from "../models/dynamicConfig";
import { ShiftModel } from "../models/shift";

@Service()
export class DBManagerService extends DBManager {
    constructor(
        @Inject(MongooseService) db: MongooseService,
        @Inject(UserModel) users: Model<UserModel>,
        @Inject(OrganizationModel) orgs: Model<OrganizationModel>,
        @Inject(HelpRequestModel) requests: Model<HelpRequestModel>,
        @Inject(ShiftModel) shifts: Model<ShiftModel>,
        @Inject(AuthCodeModel) authCodes: Model<AuthCodeModel>,
        @Inject(DynamicConfigModel) dynamicConfig: Model<DynamicConfigModel>,
    ) {
        super(db.get(), users, orgs, requests, shifts, authCodes, dynamicConfig)
    }
}