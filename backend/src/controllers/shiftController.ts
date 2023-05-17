import { BodyParams, Controller, Get, Inject, Post, Req } from "@tsed/common";
import { Required } from "@tsed/schema";
import { AtLeast } from "common";
import API from 'common/api';
import { HelpRequest, MinHelpRequest, MinOrg, MinShift, PatchEventType, PatchPermissions, RequestStatus, RequestUpdates, ResponderRequestStatuses, UserRole } from "common/models";
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


@Controller(API.namespaces.shift)
export class ShiftController implements APIController<'createNewShift'> {
    @Inject(DBManagerService) db: DBManagerService;

    // TODO: find a better place to inject this so it is instantiated
    @Inject(UIUpdateService) uiUpdateService: UIUpdateService;

    // eventually these will probably also trigger notifications
    @Inject(Notifications) notifications: Notifications;
    @Inject(PubSubService) pubSub: PubSubService;
    @Inject(MySocketService) socket: MySocketService;

    @Post(API.server.createNewShift())
    @RequireAllPermissions([PatchPermissions.ShiftAdmin])
    async createNewShift(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Required() @BodyParams('shift') shift: MinShift,
    ) {
        const createdShift = await this.db.createShift(shift, orgId);

        const res = this.db.fullShift(createdShift);

        await this.pubSub.sys(PatchEventType.ShiftCreated, { 
            shiftId: res.id,
            orgId 
        });

        return res;
    }

    @Get(API.server.getShift())
    @RequireAllPermissions([])
    async getShift(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        // getting this off the header so we can use get without having to introduce 
        // path params
        @RequestId() shiftId: string
    ) {
        const shift = this.db.fullShift((await this.db.resolveShift(shiftId)))

        return shift;
    }

    @Post(API.server.getShifts())
    @RequireAllPermissions([])
    async getShifts(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @BodyParams('shiftIds') shiftIds?: string[]
    ) {
        if (shiftIds && shiftIds.length) {
            return (await this.db.getSpecificShifts(orgId, shiftIds)).map(this.db.fullShift)
        } else {
            return (await this.db.getAllShifts(orgId)).map(this.db.fullShift)
        }
    }
}