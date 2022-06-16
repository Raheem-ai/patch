import { BodyParams, Controller, Get, Inject, Post, Req } from "@tsed/common";
import { MongooseDocument } from "@tsed/mongoose";
import { Authenticate } from "@tsed/passport";
import { Required } from "@tsed/schema";
import { AtLeast } from "common";
import API from 'common/api';
import { ChatMessage, HelpRequest, HelpRequestFilter, MinHelpRequest, MinOrg, PatchEventType, ResponderRequestStatuses, UserRole } from "common/models";
import { assignedResponderBasedRequestStatus } from "common/utils/requestUtils";
import { APIController, OrgId, RequestId } from ".";
import { HelpReq, RequestAccess } from "../middlewares/requestAccessMiddleware";
import { RequireRoles } from "../middlewares/userRoleMiddleware";
import { HelpRequestDoc } from "../models/helpRequest";
import { UserDoc, UserModel } from "../models/user";
import { User } from "../protocols/jwtProtocol";
import { DBManager } from "../services/dbManager";
import Notifications from '../services/notifications';
import { PubSubService } from "../services/pubSubService";
import { UIUpdateService } from "../services/uiUpdateService";

export class ValidatedMinOrg implements MinOrg {
    @Required()
    name: string;
}


@Controller(API.namespaces.request)
export class RequestController implements APIController<'createNewRequest' | 'getRequests' | 'getRequest' | 'unAssignRequest' | 'sendChatMessage' | 'setRequestStatus' | 'resetRequestStatus' | 'editRequest'> {
    @Inject(DBManager) db: DBManager;

    // TODO: find a better place to inject this so it is instantiated
    @Inject(UIUpdateService) uiUpdateService: UIUpdateService;

    // eventually these will probably also trigger notifications
    @Inject(Notifications) notifications: Notifications;
    @Inject(PubSubService) pubSub: PubSubService;

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

        const res = this.includeVirtuals(createdReq);

        await this.pubSub.sys(PatchEventType.RequestCreated, { requestId: res.id });

        return res;
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
        const res = this.includeVirtuals((await this.db.resolveRequest(requestId)))

        return res;
    }

    @Post(API.server.getRequests())
    @RequireRoles([UserRole.Dispatcher, UserRole.Responder, UserRole.Admin])
    async getRequests(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @BodyParams('requestIds') requestIds?: string[]
    ) {
        if (requestIds && requestIds.length) {
            return (await this.db.getSpecificRequests(orgId, requestIds)).map(this.includeVirtuals)
        } else {
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
        const res = this.includeVirtuals((await this.db.editRequest(helpRequest, requestUpdates)))

        await this.pubSub.sys(PatchEventType.RequestEdited, { requestId: res.id });

        return res;
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
        const res =  this.includeVirtuals(await this.db.sendMessageToReq(user, helpRequest, message));

        await this.pubSub.sys(PatchEventType.RequestChatNewMessage, { 
            requestId: res.id,
            userId: user.id 
        });

        return res;
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
        helpRequest.statusEvents.push({
            status: status,
            setBy: user.id,
            setAt: new Date().toString() // TODO: specific format?
        });

        helpRequest.markModified('statusEvents');

        const res = await helpRequest.save();

        await this.pubSub.sys(PatchEventType.RequestEdited, { requestId: res.id });

        return res
    }

    @Post(API.server.resetRequestStatus())
    @RequestAccess()
    async resetRequestStatus(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @HelpReq() helpRequest: HelpRequestDoc,
    ) {
        helpRequest.status = assignedResponderBasedRequestStatus(helpRequest);
        const res = await helpRequest.save();

        await this.pubSub.sys(PatchEventType.RequestEdited, { requestId: res.id });

        return res
    }
    
}