import { BodyParams, Controller, Inject, Post, Req } from "@tsed/common";
import { MongooseModel } from "@tsed/mongoose";
import { Required } from "@tsed/schema";
import API from 'common/api';
import { PatchEventType, UserOrgConfig, UserRole } from "common/models";
import { request } from "express";
import { APIController, OrgId } from ".";
import { RequireRoles } from "../middlewares/userRoleMiddleware";
import { UserDoc, UserModel } from "../models/user";
import { User } from "../protocols/jwtProtocol";
import { DBManager } from "../services/dbManager";
import Notifications from '../services/notifications';
import { PubSubService } from "../services/pubSubService";

@Controller(API.namespaces.responder)
export class ResponderController implements APIController<'confirmRequestAssignment' | 'declineRequestAssignment' | 'setOnDutyStatus' | 'joinRequest' | 'leaveRequest'> {
    @Inject(UserModel) users: MongooseModel<UserModel>;
    @Inject(Notifications) notifications: Notifications;
    @Inject(DBManager) db: DBManager;
    @Inject(PubSubService) pubSub: PubSubService;

    @Post(API.server.confirmRequestAssignment())
    @RequireRoles([UserRole.Responder])
    async confirmRequestAssignment(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Required() @BodyParams('requestId') requestId: string
    ) {
        const res = await this.db.confirmRequestAssignment(requestId, user.id);

        await this.pubSub.sys(PatchEventType.RequestRespondersAccepted, {
            responderId: user.id,
            requestId
        })

        return res;
    }

    @Post(API.server.declineRequestAssignment())
    @RequireRoles([UserRole.Responder])
    async declineRequestAssignment(
        @OrgId() orgId: string, 
        @User() user: UserDoc,
        @Required() @BodyParams('requestId') requestId: string
    ) {
        const res = await this.db.declineRequestAssignment(requestId, user.id);

        await this.pubSub.sys(PatchEventType.RequestRespondersDeclined, {
            responderId: user.id,
            requestId
        })

        return res;
    }

    @Post(API.server.setOnDutyStatus())
    @RequireRoles([UserRole.Responder])
    async setOnDutyStatus(
        @OrgId() orgId: string, 
        @User() user: UserDoc,
        @Required() @BodyParams('onDuty') onDuty: boolean
    ) {
        await this.db.updateUsersOrgConfig(user, orgId, (config: UserOrgConfig) => {
            config.onDuty = onDuty;
            return config;
        })

        const updatedUser = await user.save();

        await this.pubSub.sys(onDuty ? PatchEventType.UserOnDuty : PatchEventType.UserOffDuty, {
            userId: user.id
        })

        return this.db.me(updatedUser);
    }

    @Post(API.server.joinRequest())
    @RequireRoles([UserRole.Responder])
    async joinRequest(
        @OrgId() orgId: string, 
        @User() user: UserDoc,
        @Required() @BodyParams('requestId') requestId: string
    ) {
        const res = await this.db.confirmRequestAssignment(requestId, user.id)

        await this.pubSub.sys(PatchEventType.RequestRespondersJoined, {
            responderId: user.id,
            requestId
        })

        return res;
    }

    @Post(API.server.leaveRequest())
    @RequireRoles([UserRole.Responder])
    async leaveRequest(
        @OrgId() orgId: string, 
        @User() user: UserDoc,
        @Required() @BodyParams('requestId') requestId: string
    ) {
        const res = await this.db.declineRequestAssignment(requestId, user.id)

        await this.pubSub.sys(PatchEventType.RequestRespondersLeft, {
            responderId: user.id,
            requestId
        })

        return res;
    }
}