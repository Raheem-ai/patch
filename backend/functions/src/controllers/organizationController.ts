import { BodyParams, Controller, Get, Inject, Post, Req } from "@tsed/common";
import { MongooseDocument } from "@tsed/mongoose";
import { Authenticate } from "@tsed/passport";
import { Required } from "@tsed/schema";
import API from 'common/api';
import { MinOrg, Organization, UserRole } from "common/models";
import { APIController, OrgId } from ".";
import { RequireRoles } from "../middlewares/userRoleMiddleware";
import { UserDoc, UserModel } from "../models/user";
import { User } from "../protocols/jwtProtocol";
import { DBManager } from "../services/dbManager";
import Notifications from '../services/notifications';

export class ValidatedMinOrg implements MinOrg {
    @Required()
    name: string;
}


@Controller(API.namespaces.organization)
export class OrganizationController implements APIController<'createOrg' | 'addUserRoles' | 'removeUserRoles' | 'removeUserFromOrg' | 'addUserToOrg' | 'getTeamMembers' | 'getRespondersOnDuty'> {
    @Inject(DBManager) db: DBManager;

    // eventually these will probably also trigger notifications
    @Inject(Notifications) notifications: Notifications;

    @Post(API.server.createOrg())
    @Authenticate()
    async createOrg(
        @User() user: UserDoc,
        @Required() @BodyParams('org') minOrg: ValidatedMinOrg,
    ) {
        const [ org, admin ] = await this.db.createOrganization(minOrg, user.id);

        return {
            org: this.db.protectedOrganization(org),
            user: this.db.me(admin)
        }
    }

    @Post(API.server.addUserToOrg())
    @RequireRoles([UserRole.Admin])
    async addUserToOrg(
        @OrgId() orgId: string,
        @Req() req,
        @Required() @BodyParams('userId') userId: string,
        @Required() @BodyParams('roles') roles: UserRole[]
    ) {
        const [ org, user ] = await this.db.addUserToOrganization(orgId, userId, roles);

        return {
            org: this.db.protectedOrganization(org),
            user: this.db.protectedUserFromDoc(user)
        }
    }
    
    @Post(API.server.removeUserFromOrg())
    @RequireRoles([UserRole.Admin])
    async removeUserFromOrg(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Required() @BodyParams('userId') userId: string
    ) {
        const [ org, removedUser ] = await this.db.removeUserFromOrganization(orgId, userId);

        return {
            org: this.db.protectedOrganization(org),
            user: this.db.protectedUserFromDoc(removedUser)
        }
    }
    
    @Post(API.server.removeUserRoles())
    @RequireRoles([UserRole.Admin])
    async removeUserRoles(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Required() @BodyParams('userId') userId: string,
        @Required() @BodyParams('roles') roles: UserRole[]
    ) {
        return this.db.protectedUserFromDoc(await this.db.removeUserRoles(orgId, userId, roles));
    }
    
    @Post(API.server.addUserRoles())
    @RequireRoles([UserRole.Admin])
    async addUserRoles(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Required() @BodyParams('userId') userId: string,
        @Required() @BodyParams('roles') roles: UserRole[]
    ) {
        return this.db.protectedUserFromDoc(await this.db.addUserRoles(orgId, userId, roles));
    }

    @Get(API.server.getTeamMembers())
    @RequireRoles([UserRole.Admin, UserRole.Dispatcher, UserRole.Responder])
    async getTeamMembers(
        @OrgId() orgId: string,
        @User() user: UserDoc,
    ) {
        const org = await this.db.resolveOrganization(orgId);
        return this.db.protectedOrganization(org).members;
    }

    @Get(API.server.getRespondersOnDuty())
    @RequireRoles([UserRole.Admin, UserRole.Dispatcher, UserRole.Responder])
    async getRespondersOnDuty(
        @OrgId() orgId: string,
        @User() user: UserDoc,
    ) {
        return await this.db.getOrgResponders(orgId); // TODO: then filter by who's on duty
    }
}