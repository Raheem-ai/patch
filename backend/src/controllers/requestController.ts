import { BodyParams, Controller, Get, Inject, Post, Req } from "@tsed/common";
import { Required } from "@tsed/schema";
import { AtLeast } from "common";
import API from 'common/api';
import { HelpRequest, MinHelpRequest, MinOrg, PatchEventType, PatchPermissions, RequestStatus, RequestUpdates, ResponderRequestStatuses, UserRole } from "common/models";
import { assignedResponderBasedRequestStatus, getPreviousOpenStatus as getPreviousOpenStatus } from "common/utils/requestUtils";
import { APIController, OrgId, RequestId } from ".";
import { HelpReq, RequestAdminOrOnRequestWithPermissions, RequestAdminOrWithPermissions } from "../middlewares/requestAccessMiddleware";
import { RequireAllPermissions } from "../middlewares/userRoleMiddleware";
import { HelpRequestDoc } from "../models/helpRequest";
import { UserDoc } from "../models/user";
import { User } from "../protocols/jwtProtocol";
import { DBManagerService } from "../services/dbManagerService";
import Notifications from '../services/notifications';
import { PubSubService } from "../services/pubSubService";
import { MySocketService } from "../services/socketService";
import { UIUpdateService } from "../services/uiUpdateService";

export class ValidatedMinOrg implements MinOrg {
    @Required()
    name: string;
}


@Controller(API.namespaces.request)
export class RequestController implements APIController<'createNewRequest' | 'getRequests' | 'getRequest' | 'sendChatMessage' | 'setRequestStatus' | 'resetRequestStatus' | 'editRequest' | 'deleteRequest'> {
    @Inject(DBManagerService) db: DBManagerService;

    // TODO: find a better place to inject this so it is instantiated
    @Inject(UIUpdateService) uiUpdateService: UIUpdateService;

    // eventually these will probably also trigger notifications
    @Inject(Notifications) notifications: Notifications;
    @Inject(PubSubService) pubSub: PubSubService;
    @Inject(MySocketService) socket: MySocketService;

    @Post(API.server.createNewRequest())
    @RequireAllPermissions([PatchPermissions.RequestAdmin])
    async createNewRequest(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Required() @BodyParams('request') request: MinHelpRequest,
    ) {
        const createdReq = await this.db.createRequest(request, orgId, user.id);

        const res = this.db.fullHelpRequest(createdReq);

        await this.pubSub.sys(PatchEventType.RequestCreated, { 
            requestId: res.id,
            orgId 
        });

        return res;
    }

    @Get(API.server.getRequest())
    @RequireAllPermissions([])
    async getRequest(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        // getting this off the header so we can use get without having to introduce 
        // path params
        @RequestId() requestId: string
    ) {
        const res = this.db.fullHelpRequest((await this.db.resolveRequest(requestId)))

        return res;
    }

    @Post(API.server.getRequests())
    @RequireAllPermissions([])
    async getRequests(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @BodyParams('requestIds') requestIds?: string[]
    ) {
        if (requestIds && requestIds.length) {
            return (await this.db.getSpecificRequests(orgId, requestIds)).map(this.db.fullHelpRequest)
        } else {
            return (await this.db.getAllRequests(orgId)).map(this.db.fullHelpRequest)
        }
    }

    @Post(API.server.editRequest())
    @RequestAdminOrWithPermissions([PatchPermissions.EditRequestData])
    async editRequest(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @HelpReq() helpRequest: HelpRequestDoc,
        @BodyParams('requestUpdates') requestUpdates: AtLeast<HelpRequest, 'id'>,
    ) {
        const res = this.db.fullHelpRequest((await this.db.editRequest(helpRequest, requestUpdates)))

        await this.pubSub.sys(PatchEventType.RequestEdited, { 
            requestId: res.id,
            orgId 
        });

        return res;
    }

    @Post(API.server.editRequestV2())
    @RequestAdminOrWithPermissions([PatchPermissions.EditRequestData])
    async editRequestV2(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @HelpReq() helpRequest: HelpRequestDoc,
        @BodyParams('requestUpdates') requestUpdates: RequestUpdates,
    ) {
        const res = this.db.fullHelpRequest((await this.db.editRequestV2(helpRequest, requestUpdates)))

        await this.pubSub.sys(PatchEventType.RequestEdited, { 
            requestId: res.id,
            orgId 
        });

        return res;
    }

    @Post(API.server.sendChatMessage())
    @RequestAdminOrWithPermissions([PatchPermissions.EditRequestData])
    async sendChatMessage(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @HelpReq() helpRequest: HelpRequestDoc,
        @Required() @BodyParams('message') message: string,
    ) {
        const res =  this.db.fullHelpRequest(await this.db.sendMessageToReq(user, helpRequest, message));

        await this.pubSub.sys(PatchEventType.RequestChatNewMessage, { 
            orgId,
            requestId: res.id,
            userId: user.id 
        });

        return res;
    }

    /**
     * TODO: permission model is misalligned with frontend
     * 
     * 1) this asks for either requestadmin permissions or editRequestdata permissions to update your receipts
     * 2) frontend only cares that you have requestAdmin permissions, seeallchats permissions, or are on the request
     * 
     * */ 
    @Post(API.server.updateRequestChatReceipt())
    @RequestAdminOrWithPermissions([PatchPermissions.EditRequestData])
    async updateRequestChatReceipt(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @HelpReq() helpRequest: HelpRequestDoc,
        @Required() @BodyParams('lastMessageId') lastMessageId: number,
    ) {
        return this.db.fullHelpRequest(await this.db.updateRequestChatRecepit(helpRequest, user.id, lastMessageId));
    }
    
    @Post(API.server.setRequestStatus())
    @RequestAdminOrWithPermissions([PatchPermissions.EditRequestData])
    async setRequestStatus(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @HelpReq() helpRequest: HelpRequestDoc,
        @Required() @BodyParams('status') status: ResponderRequestStatuses,
    ) {
        return await this._setRequestStatus(orgId, user, helpRequest, status)
    }

    @Post(API.server.closeRequest())
    @RequestAdminOrOnRequestWithPermissions([PatchPermissions.CloseRequests])
    async closeRequest(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @HelpReq() helpRequest: HelpRequestDoc,
    ) {
        return await this._setRequestStatus(orgId, user, helpRequest, RequestStatus.Closed)
    }

    @Post(API.server.resetRequestStatus())
    @RequestAdminOrWithPermissions([PatchPermissions.EditRequestData])
    async resetRequestStatus(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @HelpReq() helpRequest: HelpRequestDoc,
    ) {
        const org = await this.db.resolveOrganization(orgId);
        const usersRemovedFromOrg = org.removedMembers as string[];

        helpRequest.status = assignedResponderBasedRequestStatus(helpRequest, usersRemovedFromOrg);
        
        const res = await helpRequest.save();

        await this.pubSub.sys(PatchEventType.RequestEdited, { 
            requestId: res.id,
            orgId 
        });

        return this.db.fullHelpRequest(res)
    }


    @Post(API.server.reopenRequest())
    @RequestAdminOrOnRequestWithPermissions([PatchPermissions.CloseRequests])
    async reopenRequest(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @HelpReq() helpRequest: HelpRequestDoc,
    ) {
        helpRequest.status = getPreviousOpenStatus(helpRequest);
        
        helpRequest.statusEvents.push({
            status: helpRequest.status,
            setBy: user.id,
            setAt: new Date().toISOString()
        });

        helpRequest.markModified('statusEvents');

        const res = await helpRequest.save();

        await this.pubSub.sys(PatchEventType.RequestEdited, { 
            requestId: res.id,
            orgId 
        });

        return this.db.fullHelpRequest(res)
    }

    @Post(API.server.deleteRequest())
    @RequireAllPermissions([PatchPermissions.RemoveFromOrg])
    async deleteRequest(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Required() @BodyParams('requestId') requestId: string
    ) {

        const deleterId = user.id; 

        await this.pubSub.sys(PatchEventType.RequestDeleted, { 
            requestId,
            orgId,
            deleterId
        });

        await this.db.deleteRequest(requestId);

    }

    async _setRequestStatus(
        orgId: string,
        user: UserDoc,
        helpRequest: HelpRequestDoc,
        status: RequestStatus,
    ) {
        helpRequest.status = status;
        helpRequest.statusEvents.push({
            status: status,
            setBy: user.id,
            setAt: new Date().toISOString()
        });

        helpRequest.markModified('statusEvents');

        const res = await helpRequest.save();

        await this.pubSub.sys(PatchEventType.RequestEdited, { 
            requestId: res.id,
            orgId 
        });

        return this.db.fullHelpRequest(res)
    }
}