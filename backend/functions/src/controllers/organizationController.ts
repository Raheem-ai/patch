import { BodyParams, Controller, HeaderParams, Inject, Post, Req } from "@tsed/common";
import { MongooseDocument, MongooseModel } from "@tsed/mongoose";
import { Authenticate } from "@tsed/passport";
import { Required } from "@tsed/schema";
import API from 'common/api';
import { MinOrg, NotificationType, Organization, User, UserRole } from "common/models";
import { APIController } from ".";
import { RequireRoles } from "../middlewares/userRoleMiddleware";
import { UserModel } from "../models/user";
import { DBManager } from "../services/dbManager";
import Notifications from '../services/notifications';

export class ValidatedMinOrg implements MinOrg {
    @Required()
    name: string;
}

@Controller(API.namespaces.organization)
export class OrganizationController implements APIController<'createOrg' | 'addUserRoles' | 'removeUserRoles' | 'removeUserFromOrg' | 'addUserToOrg'> {
    @Inject(DBManager) db: DBManager;

    // eventually these will probably also trigger notifications
    @Inject(Notifications) notifications: Notifications;

    @Post(API.server.createOrg())
    @Authenticate()
    async createOrg(
        @Req() req: Req,
        @Required() @BodyParams('org') minOrg: ValidatedMinOrg,
    ) {
        const user = req.user as MongooseDocument<UserModel>;
        const [ org, admin ] = await this.db.createOrganization(minOrg, user.id);

        return {
            org: org.toJSON() as Organization,
            user: this.db.me(admin)
        }
    }

    @Post(API.server.addUserToOrg())
    @RequireRoles([UserRole.Admin])
    async addUserToOrg(
        @Req() req: Req,
        @HeaderParams(API.orgIDHeader) orgId: string,
        @Required() @BodyParams('userId') userId: string,
        @Required() @BodyParams('roles') roles: UserRole[]
    ) {
        const [ org, user ] = await this.db.addUserToOrganization(orgId, userId, roles);

        return {
            org: org.toJSON() as Organization,
            user: this.db.protectedUser(user)
        }
    }
    
    @Post(API.server.removeUserFromOrg())
    @RequireRoles([UserRole.Admin])
    async removeUserFromOrg(
        @Req() req: Req,
        @HeaderParams(API.orgIDHeader) orgId: string,
        @Required() @BodyParams('userId') userId: string
    ) {
        const [ org, user ] = await this.db.removeUserFromOrganization(orgId, userId);

        return {
            org: org.toJSON() as Organization,
            user: this.db.protectedUser(user)
        }
    }
    
    @Post(API.server.removeUserRoles())
    @RequireRoles([UserRole.Admin])
    async removeUserRoles(
        @Req() req: Req,
        @HeaderParams(API.orgIDHeader) orgId: string,
        @Required() @BodyParams('userId') userId: string,
        @Required() @BodyParams('roles') roles: UserRole[]
    ) {
        return this.db.protectedUser(await this.db.removeUserRoles(orgId, userId, roles));
    }
    
    @Post(API.server.addUserRoles())
    @RequireRoles([UserRole.Admin])
    async addUserRoles(
        @Req() req: Req,
        @HeaderParams(API.orgIDHeader) orgId: string,
        @Required() @BodyParams('userId') userId: string,
        @Required() @BodyParams('roles') roles: UserRole[]
    ) {
        return this.db.protectedUser(await this.db.addUserRoles(orgId, userId, roles));
    }

}