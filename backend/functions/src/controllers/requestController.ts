import { BodyParams, Controller, Get, Inject, Post, Req } from "@tsed/common";
import { MongooseDocument } from "@tsed/mongoose";
import { Authenticate } from "@tsed/passport";
import { Required } from "@tsed/schema";
import API from 'common/api';
import { ChatMessage, MinHelpRequest, MinOrg, ResponderRequestStatuses, UserRole } from "common/models";
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


@Controller(API.namespaces.organization)
export class RequestController implements APIController<'createNewRequest' | 'getRequests' | 'getRequest' | 'unAssignRequest' | 'sendChatMessage' | 'setTeamStatus'> {
    @Inject(DBManager) db: DBManager;

    // eventually these will probably also trigger notifications
    @Inject(Notifications) notifications: Notifications;

    @Post(API.server.createNewRequest())
    @RequireRoles([UserRole.Dispatcher])
    async createNewRequest(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Required() @BodyParams('request') request: MinHelpRequest,
    ) {
        const createdReq = await this.db.createRequest(request, orgId, user.id);

        return createdReq.toJSON();
    }

    @Get(API.server.getRequest())
    @RequireRoles([UserRole.Dispatcher, UserRole.Responder])
    async getRequest(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        // getting this off the header so we can use get without having to introduce 
        // path params
        @RequestId() requestId: string
    ) {
        return (await this.db.resolveRequest(requestId)).toJSON()
    }

    @Get(API.server.getRequests())
    @RequireRoles([UserRole.Dispatcher, UserRole.Responder])
    async getRequests(
        @OrgId() orgId: string,
        @User() user: UserDoc
    ) {
        const requests = await this.db.getUnfinishedRequests(orgId);
        return requests.map(r => r.toJSON());
    }

    @Post(API.server.unAssignRequest())
    @RequestAccess()
    async unAssignRequest(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @HelpReq() helpRequest: HelpRequestDoc,
        @Required() @BodyParams('userId') userId: string,
    ) {
        const idx = helpRequest.responderIds.findIndex(id => id === userId);

        if (idx != -1) {
            helpRequest.responderIds.splice(idx, 1);
            await helpRequest.save();
        }
    }

    @Post(API.server.sendChatMessage())
    @RequestAccess()
    async sendChatMessage(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @HelpReq() helpRequest: HelpRequestDoc,
        @Required() @BodyParams('message') message: ChatMessage,
    ) {
        helpRequest.chat.push(message);
        await helpRequest.save();
    }
    
    @Post(API.server.setTeamStatus())
    @RequestAccess()
    async setTeamStatus(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @HelpReq() helpRequest: HelpRequestDoc,
        @Required() @BodyParams('status') status: ResponderRequestStatuses,
    ) {
        helpRequest.status = status;
        await helpRequest.save();
    }
    
}