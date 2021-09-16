import { BodyParams, Controller, Inject, Post, Req } from "@tsed/common";
import { MongooseModel } from "@tsed/mongoose";
import { Required } from "@tsed/schema";
import API from 'common/api';
import { UserRole } from "common/models";
import { APIController, OrgId } from ".";
import { RequireRoles } from "../middlewares/userRoleMiddleware";
import { UserDoc, UserModel } from "../models/user";
import { User } from "../protocols/jwtProtocol";
import Notifications from '../services/notifications';

@Controller(API.namespaces.responder)
export class ResponderController implements APIController<'confirmRequestAssignment' | 'declineRequestAssignment'> {
    @Inject(UserModel) users: MongooseModel<UserModel>;
    @Inject(Notifications) notifications: Notifications;

    @Post(API.server.confirmRequestAssignment())
    @RequireRoles([UserRole.Responder])
    async confirmRequestAssignment(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Required() @BodyParams('requestId') requestId: string
    ) {
        console.log('confirmed!')
    }

    @Post(API.server.declineRequestAssignment())
    @RequireRoles([UserRole.Responder])
    async declineRequestAssignment(
        @OrgId() orgId: string, 
        @User() user: UserDoc,
        @Required() @BodyParams('requestId') requestId: string
    ) {
        console.log('declined!')
    }
}