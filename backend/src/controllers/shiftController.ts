import { BodyParams, Controller, Get, Inject, Post, Req } from "@tsed/common";
import { Required } from "@tsed/schema";
import API from 'common/api';
import { MinOrg, MinShift, PatchEventType, PatchPermissions, ShiftUpdates } from "common/models";
import { APIController, OrgId, ShiftId } from ".";
import { RequireAllPermissions } from "../middlewares/userRoleMiddleware";
import { UserDoc } from "../models/user";
import { User } from "../protocols/jwtProtocol";
import { DBManagerService } from "../services/dbManagerService";
import Notifications from '../services/notifications';
import { PubSubService } from "../services/pubSubService";
import { MySocketService } from "../services/socketService";
import { UIUpdateService } from "../services/uiUpdateService";
import { ShiftDoc } from "../models/shift";
import { Shift, ShiftAdminOrWithPermissions } from "../middlewares/shiftAccessMiddleware";

export class ValidatedMinOrg implements MinOrg {
    @Required()
    name: string;
}


@Controller(API.namespaces.shift)
export class ShiftController implements APIController<'createNewShift' | 'editShift'> {
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

    // TODO: Require permissions
    @Post(API.server.editShift())
    @ShiftAdminOrWithPermissions([])
    async editShift(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Shift() shift: ShiftDoc,
        @BodyParams('shiftUpdates') shiftUpdates: ShiftUpdates,
        @BodyParams('shiftOccurrenceId') shiftOccurrenceId?: string,
        ) {
        const res = this.db.fullShift((await this.db.editShift(shift, shiftUpdates, shiftOccurrenceId)))

        await this.pubSub.sys(PatchEventType.ShiftEdited, { 
            shiftId: res.id,
            orgId 
        });

        return res;
    }
}