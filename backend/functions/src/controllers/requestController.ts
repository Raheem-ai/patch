import { BodyParams, Controller, Get, Inject, Post, Req } from "@tsed/common";
import { MongooseDocument } from "@tsed/mongoose";
import { Authenticate } from "@tsed/passport";
import { Required } from "@tsed/schema";
import { AtLeast } from "common";
import API from 'common/api';
import { ChatMessage, HelpRequest, HelpRequestFilter, MinHelpRequest, MinOrg, ResponderRequestStatuses, UserRole } from "common/models";
import { assignedResponderBasedRequestStatus } from "common/utils/requestUtils";
import { APIController, OrgId, RequestId } from ".";
import { HelpReq, RequestAccess } from "../middlewares/requestAccessMiddleware";
import { RequireRoles } from "../middlewares/userRoleMiddleware";
import { HelpRequestDoc } from "../models/helpRequest";
import { UserDoc, UserModel } from "../models/user";
import { User } from "../protocols/jwtProtocol";
import { DBManager } from "../services/dbManager";
import Notifications from '../services/notifications';

export class ValidatedMinOrg implements MinOrg {
    @Required()
    name: string;
}


@Controller(API.namespaces.request)
export class RequestController implements APIController<'createNewRequest' | 'getRequests' | 'getRequest' | 'unAssignRequest' | 'sendChatMessage' | 'setRequestStatus' | 'resetRequestStatus' | 'editRequest'> {
    @Inject(DBManager) db: DBManager;

    // eventually these will probably also trigger notifications
    @Inject(Notifications) notifications: Notifications;

    includeVirtuals(helpRequest: HelpRequestDoc): HelpRequest {
        return helpRequest.toObject({ virtuals: true });
    }

    @Post(API.server.createNewRequest())
    @RequireRoles([UserRole.Dispatcher])
    async createNewRequest(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Required() @BodyParams('request') request: MinHelpRequest,
    ) {
        const createdReq = await this.db.createRequest(request, orgId, user.id);

        return this.includeVirtuals(createdReq);
    }

    @Get(API.server.getRequest())
    @RequireRoles([UserRole.Dispatcher, UserRole.Responder, UserRole.Admin])
    async getRequest(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        // getting this off the header so we can use get without having to introduce 
        // path params
        @RequestId() requestId: string
    ) {
        return this.includeVirtuals((await this.db.resolveRequest(requestId)))
    }

    @Post(API.server.getRequests())
    @RequireRoles([UserRole.Dispatcher, UserRole.Responder, UserRole.Admin])
    async getRequests(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @BodyParams('filter') filter: HelpRequestFilter
    ) {
        switch (filter) {
            case HelpRequestFilter.Active:
                return (await this.db.getActiveRequests(orgId)).map(this.includeVirtuals);
            case HelpRequestFilter.Finished: 
                return (await this.db.getFinishedRequests(orgId)).map(this.includeVirtuals)
            case HelpRequestFilter.All:
                return (await this.db.getAllRequests(orgId)).map(this.includeVirtuals)
        }
    }

    @Post(API.server.editRequest())
    @RequestAccess()
    async editRequest(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @HelpReq() helpRequest: HelpRequestDoc,
        @BodyParams('requestUpdates') requestUpdates: AtLeast<HelpRequest, 'id'>,
    ) {
        return this.includeVirtuals((await this.db.editRequest(helpRequest, requestUpdates)))
    }

    @Post(API.server.unAssignRequest())
    @RequestAccess()
    async unAssignRequest(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @HelpReq() helpRequest: HelpRequestDoc,
        @Required() @BodyParams('userId') userId: string,
    ) {
        const idx = helpRequest.assignedResponderIds.findIndex(id => id === userId);

        if (idx != -1) {
            helpRequest.assignedResponderIds.splice(idx, 1);
            await helpRequest.save();
        }
    }

    @Post(API.server.sendChatMessage())
    @RequestAccess()
    async sendChatMessage(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @HelpReq() helpRequest: HelpRequestDoc,
        @Required() @BodyParams('message') message: string,
    ) {
        return this.includeVirtuals(await this.db.sendMessageToReq(user, helpRequest, message));
    }

    @Post(API.server.updateRequestChatReceipt())
    @RequestAccess()
    async updateRequestChatReceipt(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @HelpReq() helpRequest: HelpRequestDoc,
        @Required() @BodyParams('lastMessageId') lastMessageId: number,
    ) {
        return this.includeVirtuals(await this.db.updateRequestChatRecepit(helpRequest, user.id, lastMessageId));
    }
    
    @Post(API.server.setRequestStatus())
    @RequestAccess()
    async setRequestStatus(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @HelpReq() helpRequest: HelpRequestDoc,
        @Required() @BodyParams('status') status: ResponderRequestStatuses,
    ) {
        helpRequest.status = status;
        return await helpRequest.save();
    }

    @Post(API.server.resetRequestStatus())
    @RequestAccess()
    async resetRequestStatus(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @HelpReq() helpRequest: HelpRequestDoc,
    ) {
        helpRequest.status = assignedResponderBasedRequestStatus(helpRequest);
        return await helpRequest.save();
    }
    
}