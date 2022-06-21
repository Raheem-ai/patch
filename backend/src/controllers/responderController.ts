import { BodyParams, Controller, Inject, Post, Req } from "@tsed/common";
import { Unauthorized } from "@tsed/exceptions";
import { MongooseModel } from "@tsed/mongoose";
import { Required } from "@tsed/schema";
import API from 'common/api';
import { PatchEventType, UserOrgConfig, UserRole } from "common/models";
import { userCanJoinRequestPosition } from "common/utils/requestUtils";
import { request } from "express";
import { APIController, OrgId } from ".";
import { RequireRoles } from "../middlewares/userRoleMiddleware";
import { UserDoc, UserModel } from "../models/user";
import { User } from "../protocols/jwtProtocol";
import { DBManager } from "../services/dbManager";
import Notifications from '../services/notifications';
import { PubSubService } from "../services/pubSubService";

@Controller(API.namespaces.responder)
export class ResponderController implements APIController<
    'setOnDutyStatus' 
    | 'joinRequest' 
    | 'leaveRequest'
    | 'requestToJoinRequest'    
    | 'ackRequestNotification'
> {
    @Inject(UserModel) users: MongooseModel<UserModel>;
    @Inject(Notifications) notifications: Notifications;
    @Inject(DBManager) db: DBManager;
    @Inject(PubSubService) pubSub: PubSubService;    

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
        @Required() @BodyParams('requestId') requestId: string,
        @Required() @BodyParams('positionId') positionId: string
    ) {

        const req = await this.db.resolveRequest(requestId);

        if (userCanJoinRequestPosition(req, positionId, user, orgId)) {
            const res = await this.db.joinRequest(requestId, user.id, positionId);
        
            await this.pubSub.sys(PatchEventType.RequestRespondersJoined, {
                responderId: user.id,
                requestId,
                positionId,
                orgId
            })
    
            return res;
        } else {
            throw new Unauthorized('You do not have the required attributes and/or role to join this poition.')
        }
    }

    @Post(API.server.leaveRequest())
    @RequireRoles([UserRole.Responder])
    async leaveRequest(
        @OrgId() orgId: string, 
        @User() user: UserDoc,
        @Required() @BodyParams('requestId') requestId: string,
        @Required() @BodyParams('positionId') positionId: string
    ) {
        const res = await this.db.leaveRequest(requestId, user.id, positionId)

        await this.pubSub.sys(PatchEventType.RequestRespondersLeft, {
            responderId: user.id,
            requestId, 
            positionId,
            orgId
        })

        return res;
    }

    @Post(API.server.requestToJoinRequest())
    @RequireRoles([UserRole.Responder])
    async requestToJoinRequest(
        @OrgId() orgId: string, 
        @User() user: UserDoc,
        @Required() @BodyParams('requestId') requestId: string,
        @Required() @BodyParams('positionId') positionId: string
    ) {
        // const res = await this.db.confirmRequestAssignment(requestId, user.id)
        const res = await this.db.requestToJoinRequest(requestId, user.id, positionId)

        // 
        // await this.pubSub.sys(PatchEventType.RequestRespondersJoined, {
        //     responderId: user.id,
        //     requestId
        // })

        return res
    }

    @Post(API.server.ackRequestNotification())
    @RequireRoles([UserRole.Responder])
    async ackRequestNotification(
        @OrgId() orgId: string, 
        @User() user: UserDoc,
        @Required() @BodyParams('requestId') requestId: string,
    ) {
        // const res = await this.db.confirmRequestAssignment(requestId, user.id)
        const res = await this.db.ackRequestNotification(requestId, user.id)

        // 
        // await this.pubSub.sys(PatchEventType.RequestRespondersJoined, {
        //     responderId: user.id,
        //     requestId
        // })

        return res
    }
    
}