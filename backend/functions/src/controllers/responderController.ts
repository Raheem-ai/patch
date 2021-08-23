import { Controller, Inject, Post, Req } from "@tsed/common";
import { MongooseModel } from "@tsed/mongoose";
import API from 'common/api';
import { NotificationType, User, UserRole } from "common/models";
import { RequireRoles } from "../middlewares/userRoleMiddleware";
import { UserModel } from "../models/user";
import Notifications from '../services/notifications';

@Controller(API.namespaces.responder)
export class ResponderController {
    @Inject(UserModel) users: MongooseModel<UserModel>;
    @Inject(Notifications) notifications: Notifications;

    @Post(API.server.confirmIncidentAssignment())
    @RequireRoles([UserRole.Responder])
    async confirmIncidentAssignment() {
        console.log('confirmed!')
    }

    @Post(API.server.declineIncidentAssignment())
    @RequireRoles([UserRole.Responder])
    async declineIncidentAssignment() {
        console.log('declined!')
    }
}