import { BodyParams, Controller, Get, Inject, Post, Req } from "@tsed/common";
import { BadRequest, Unauthorized } from "@tsed/exceptions";
import { MongooseDocument } from "@tsed/mongoose";
import { Authenticate } from "@tsed/passport";
import { CollectionOf, Enum, Format, Minimum, Pattern, Required } from "@tsed/schema";
import API from 'common/api';
import { LinkExperience, LinkParams, MinOrg, Organization, PatchEventType, PendingUser, ProtectedUser, RequestSkill, UserRole } from "common/models";
import { APIController, OrgId } from ".";
import { RequireRoles } from "../middlewares/userRoleMiddleware";
import { UserDoc, UserModel } from "../models/user";
import { User } from "../protocols/jwtProtocol";
import { DBManager } from "../services/dbManager";
import Notifications from '../services/notifications';
import * as uuid from 'uuid';
import { Twilio } from 'twilio';
import * as querystring from 'querystring'
import config from '../config';
import { PubSubService } from "../services/pubSubService";

export class ValidatedMinOrg implements MinOrg {
    @Required()
    name: string;
}

const twilioConfig = config.TWILIO.get();
const twilioClient = new Twilio(twilioConfig.sID, twilioConfig.token);

@Controller(API.namespaces.organization)
export class OrganizationController implements APIController<
    'createOrg' 
    | 'addUserRoles' 
    | 'removeUserRoles' 
    | 'removeUserFromOrg' 
    | 'addUserToOrg' 
    | 'getTeamMembers' 
    | 'getRespondersOnDuty'
    | 'inviteUserToOrg'
> {
    @Inject(DBManager) db: DBManager;

    // eventually these will probably also trigger notifications
    @Inject(Notifications) notifications: Notifications;
    @Inject(PubSubService) pubSub: PubSubService;

    @Post(API.server.createOrg())
    @Authenticate()
    async createOrg(
        @User() user: UserDoc,
        @Required() @BodyParams('org') minOrg: ValidatedMinOrg,
    ) {
        const [ org, admin ] = await this.db.createOrganization(minOrg, user.id);

        return {
            org: await this.db.protectedOrganization(org),
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

        const res = {
            org: await this.db.protectedOrganization(org),
            user: this.db.protectedUserFromDoc(user)
        }

        await this.pubSub.sys(PatchEventType.UserAddedToOrg, {
            userId,
            orgId
        })

        return res;
    }
    
    @Post(API.server.removeUserFromOrg())
    @RequireRoles([UserRole.Admin])
    async removeUserFromOrg(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Required() @BodyParams('userId') userId: string
    ) {
        const [ org, removedUser ] = await this.db.removeUserFromOrganization(orgId, userId);

        const res = {
            org: await this.db.protectedOrganization(org),
            user: this.db.protectedUserFromDoc(removedUser)
        }

        await this.pubSub.sys(PatchEventType.UserRemovedFromOrg, {
            userId,
            orgId
        })

        return res;
    }
    
    @Post(API.server.removeUserRoles())
    @RequireRoles([UserRole.Admin])
    async removeUserRoles(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Required() @BodyParams('userId') userId: string,
        @Required() @BodyParams('roles') roles: UserRole[]
    ) {
        const res = this.db.protectedUserFromDoc(await this.db.removeUserRoles(orgId, userId, roles));

        await this.pubSub.sys(PatchEventType.UserChangedRolesInOrg, {
            userId,
            orgId
        })

        return res;
    }
    
    @Post(API.server.addUserRoles())
    @RequireRoles([UserRole.Admin])
    async addUserRoles(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Required() @BodyParams('userId') userId: string,
        @Required() @BodyParams('roles') roles: UserRole[]
    ) {
        const res = this.db.protectedUserFromDoc(await this.db.addUserRoles(orgId, userId, roles));

        await this.pubSub.sys(PatchEventType.UserChangedRolesInOrg, {
            userId,
            orgId
        })

        return res;
    }

    @Post(API.server.getTeamMembers())
    @RequireRoles([UserRole.Admin, UserRole.Dispatcher, UserRole.Responder])
    async getTeamMembers(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @BodyParams('userIds') userIds?: string[]
    ) {
        const org = await this.db.resolveOrganization(orgId);
        const protectedOrg = await this.db.protectedOrganization(org); 
        
        const orgMembers = protectedOrg.members;
        const removedOrgMembers = protectedOrg.removedMembers;

        if (userIds && userIds.length) {
            const specificMembers: ProtectedUser[] = [];
            const usersNotInOrg: string[] = [];

            for (const id of userIds) {
                const idx = orgMembers.findIndex(member => member.id == id);

                if (idx != -1) {
                    specificMembers.push(orgMembers[idx])
                } else {
                    const removedIdx = removedOrgMembers.findIndex(member => member.id == id);

                    if (removedIdx != -1) {
                        specificMembers.push(removedOrgMembers[removedIdx])
                    } else {
                        usersNotInOrg.push(id);
                    }
                }
            }

            if (usersNotInOrg.length) {
                throw new Unauthorized(`Users with ids: ${usersNotInOrg.join(', ')} are not in org: ${org.name}`)
            }

            return specificMembers

        } else {
            return orgMembers
        }
    }

    @Get(API.server.getRespondersOnDuty())
    @RequireRoles([UserRole.Admin, UserRole.Dispatcher, UserRole.Responder])
    async getRespondersOnDuty(
        @OrgId() orgId: string,
        @User() user: UserDoc,
    ) {
        return await this.db.getOrgResponders(orgId); // TODO: then filter by who's on duty
    }

    @Post(API.server.inviteUserToOrg())
    @RequireRoles([UserRole.Admin])
    async inviteUserToOrg(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Required() @Format('email') @BodyParams('email') email: string, 
        @Required() @Pattern(/[0-9]{10}/) @BodyParams('phone') phone: string, 
        // can't get this to validate right
        @Required() @BodyParams('roles') roles: UserRole[], 
        @Required() @BodyParams('skills') skills: RequestSkill[], 
        @Required() @BodyParams('baseUrl') baseUrl: string
    ) {

        if (!roles.length) {
            throw new BadRequest('You must invite a user with at least one role.')
        }

        const org = await this.db.resolveOrganization(orgId)

        const existingUser = await this.db.getUser({ email });

        const pendingUser: PendingUser = {
            email,
            phone,
            roles,
            skills,
            pendingId: uuid.v1()
        };

        await this.db.addPendingUserToOrg(org, pendingUser);

        let link: string,
            msg: string;


        // TODO: retest this when we have the concept of being part of more than one org
        if (existingUser) {
            link = this.getLinkUrl<LinkExperience.JoinOrganization>(baseUrl, LinkExperience.JoinOrganization, {
                orgId,
                email,
                roles,
                pendingId: pendingUser.pendingId    
            });

            msg = `You have been invited to join '${org.name}' on the PATCH App! If you would like to accept this invite, make sure you have PATCH installed and then click the following link to join '${org.name}'.\n${link}`;
        } else {
            link = this.getLinkUrl<LinkExperience.SignUpThroughOrganization>(baseUrl, LinkExperience.SignUpThroughOrganization, {
                orgId,
                email,
                roles,
                skills,
                pendingId: pendingUser.pendingId
            });

            msg = `You have been invited to sign up and join '${org.name}' on the PATCH App! If you would like to accept this invite, make sure you have PATCH installed and then click the following link to join '${org.name}'.\n${link}`;
        }

        const sentMessage = await twilioClient.messages.create({
            from: twilioConfig.phoneNumber, 
            to: phone,
            body: msg
        })

        if (sentMessage.errorMessage) {
            throw `Twilio Error: ${sentMessage.errorMessage}`
        }

        return pendingUser;
    }

    getLinkUrl<Exp extends LinkExperience>(baseUrl: string, exp: Exp, params: LinkParams[Exp]): string {
        const expoSection = baseUrl.startsWith('exp')
            ? '--/'
            :'';

        return `${baseUrl}/${expoSection}${exp}?${querystring.stringify(params)}`
    }
}