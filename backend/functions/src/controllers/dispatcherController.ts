import { BodyParams, Controller, Inject, Post, Req } from "@tsed/common";
import { MongooseModel } from "@tsed/mongoose";
import { Authenticate } from "@tsed/passport";
import { Required } from "@tsed/schema";
import API from 'common/api';
import { UserRole } from "common/models";
import { RequireRoles } from "../middlewares/userRoleMiddleware";
import { UserModel } from "../models/user";
import { LocalCredentials } from "../protocols/local";

@Controller(API.namespaces.dispatch)
export class DispatcherController {

    @Post(API.server.dispatch())
    @RequireRoles([UserRole.Dispatcher])
    async dispatch() {
        console.log('dispatch')
    }

}