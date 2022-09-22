import { BodyParams, Controller, Inject, Post, Req } from "@tsed/common";
import { Unauthorized } from "@tsed/exceptions";
import { MongooseModel } from "@tsed/mongoose";
import { Required } from "@tsed/schema";
import API from 'common/api';
import { PatchEventType, PatchPermissions, UserOrgConfig, UserRole } from "common/models";
import { userCanJoinRequestPosition } from "common/utils/requestUtils";
import { request } from "express";
import { APIController, OrgId } from ".";
import { RequireAllPermissions } from "../middlewares/userRoleMiddleware";
import { UserDoc, UserModel } from "../models/user";
import { User } from "../protocols/jwtProtocol";
import { DBManager } from "../services/dbManager";
import Notifications from '../services/notifications';
import { PubSubService } from "../services/pubSubService";
import { MySocketService } from "../services/socketService";
import STRINGS from "common/strings";

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
    @Inject(MySocketService) socket: MySocketService;

    @Post(API.server.setOnDutyStatus())
    @RequireAllPermissions([])
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
            userId: user.id,
            orgId
        })

        return this.db.me(updatedUser);
    }

    @Post(API.server.joinRequest())
    // okay to not check for admin perms as currently they force these
    @RequireAllPermissions([PatchPermissions.EditRequestData]) 
    async joinRequest(
        @OrgId() orgId: string, 
        @User() user: UserDoc,
        @Required() @BodyParams('requestId') requestId: string,
        @Required() @BodyParams('positionId') positionId: string
    ) {

        const req = await this.db.resolveRequest(requestId);

        if (userCanJoinRequestPosition(req, positionId, user, orgId)) {
            const res = await this.db.joinRequest(orgId, requestId, user.id, positionId);

            await this.pubSub.sys(PatchEventType.RequestRespondersJoined, {
                responderId: user.id,
                requestId,
                positionId,
                orgId
            })
    
            return this.db.fullHelpRequest(res);
        } else {
            throw new Unauthorized(STRINGS.REQUESTS.POSITIONS.cannotJoin)
        }
    }

    @Post(API.server.leaveRequest())
    // okay to not check for admin perms as currently they force these
    @RequireAllPermissions([PatchPermissions.EditRequestData]) 
    async leaveRequest(
        @OrgId() orgId: string, 
        @User() user: UserDoc,
        @Required() @BodyParams('requestId') requestId: string,
        @Required() @BodyParams('positionId') positionId: string
    ) {
        const res = await this.db.leaveRequest(orgId, requestId, user.id, positionId)

        await this.pubSub.sys(PatchEventType.RequestRespondersLeft, {
            responderId: user.id,
            requestId, 
            positionId,
            orgId
        })

        return this.db.fullHelpRequest(res);
    }

    @Post(API.server.requestToJoinRequest())
    // okay to not check for admin perms as currently they force these
    @RequireAllPermissions([PatchPermissions.EditRequestData]) 
    async requestToJoinRequest(
        @OrgId() orgId: string, 
        @User() user: UserDoc,
        @Required() @BodyParams('requestId') requestId: string,
        @Required() @BodyParams('positionId') positionId: string
    ) {
        // const res = await this.db.confirmRequestAssignment(requestId, user.id)
        const res = await this.db.requestToJoinRequest(requestId, user.id, positionId)

        await this.pubSub.sys(PatchEventType.RequestRespondersRequestToJoin, {
            responderId: user.id,
            requestId, 
            orgId,
            positionId
        })

        return this.db.fullHelpRequest(res);
    }

    @Post(API.server.ackRequestNotification())
    // in case someone was notified who doesn't have permissions
    @RequireAllPermissions([])
    async ackRequestNotification(
        @OrgId() orgId: string, 
        @User() user: UserDoc,
        @Required() @BodyParams('requestId') requestId: string,
    ) {
        const res = await this.db.ackRequestNotification(requestId, user.id)

        await this.pubSub.sys(PatchEventType.RequestRespondersNotificationAck, {
            requestId, 
        })

        return this.db.fullHelpRequest(res);
    }
    
}