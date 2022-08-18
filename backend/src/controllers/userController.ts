import { BodyParams, Controller, Get, Inject, Post } from "@tsed/common";
import { BadRequest, Unauthorized } from "@tsed/exceptions";
import { MongooseModel, Schema } from "@tsed/mongoose";
import { Authenticate } from "@tsed/passport";
import { CollectionOf, Format, Optional, Property, Required } from "@tsed/schema";
import API from 'common/api';
import { AdminEditableUser, AuthTokens, BasicCredentials, CategorizedItem, EditableMe, Location, MinUser, PatchEventType, PatchPermissions, PendingUser, UserRole } from "common/models";
import { createAccessToken, createRefreshToken, verifyRefreshToken } from "../auth";
import { RequireSomePermissions } from "../middlewares/userRoleMiddleware";
import { UserDoc, UserModel } from "../models/user";
import * as uuid from 'uuid';
import { APIController, OrgId } from ".";
import { OrganizationController } from "./organizationController";
import { User } from "../protocols/jwtProtocol";
import { DBManager } from "../services/dbManager";
import { PubSubService } from "../services/pubSubService";
import { userHasPermissions } from "./utils";
import config from "../config";
import STRINGS from "../../../common/strings";

export class ValidatedMinUser implements MinUser {
    @Required()
    @Format('email')
    email: string;
    
    @Required()
    password: string;

    @Required()
    name: string;
}

export class ValidatedBasicCredentials implements BasicCredentials {
    @Required()
    @Format('email')
    email: string;
    
    @Required()
    password: string;
}

@Schema()
class CategorizedItemSchema implements CategorizedItem {
    @Required() categoryId: string
    @Required() itemId: string
}

export class ValidatedEditableUser implements Partial<AdminEditableUser> {
    @Optional()
    @CollectionOf(String)
    roleIds: string[]

    @Optional()
    @CollectionOf(CategorizedItemSchema)
    attributes: CategorizedItem[]
}

export class ValidatedMe implements Partial<EditableMe> {
    @Optional()
    @Property()
    id: string;

    @Optional()
    @Property()
    name: string;

    @Optional()
    @Format('email')
    email: string;

    @Optional()
    @Property()
    phone: string;

    @Optional()
    @Property()
    password: string;

    @Optional()
    @Property()
    displayColor: string

    @Optional()
    @Property()
    race: string
    
    @Optional()
    @Property()
    pronouns: string

    @Optional()
    @Property()
    bio: string
}

const googleMapsApiKey = config.GOOGLE_MAPS.get().api_key;

@Controller(API.namespaces.users)
export class UsersController implements APIController<
    'signUp' 
    | 'signIn' 
    | 'signOut' 
    | 'reportLocation' 
    | 'reportPushToken' 
    | 'me' 
    | 'refreshAuth' 
    | 'getSecrets'
    | 'signUpThroughOrg'
    | 'joinOrganization'
    | 'editMe'
    | 'editUser'
> {
    @Inject(DBManager) db: DBManager;
    @Inject(UserModel) users: MongooseModel<UserModel>;
    @Inject(PubSubService) pubSub: PubSubService;

    @Post(API.server.refreshAuth())
    async refreshAuth(
        @Required() @BodyParams('refreshToken') refreshToken: string
    ) {
        let user: UserDoc;

        try {
            user = await verifyRefreshToken(refreshToken, this.db);
        } catch (e) {
            if (typeof e == 'string') {
                throw new BadRequest(e)
            } else {
                throw e
            }
        }

        const accessToken = await createAccessToken(user.id, user.auth_etag)

        return accessToken;
    }
    
    @Post(API.server.signUp())
    async signUp(
        @Required() @BodyParams('user') minUser: ValidatedMinUser
    ) {
        const existingUsers = await this.users.find({ email: minUser.email });

        if (existingUsers && existingUsers.length) {
            // TODO: should this throw for a notification in the ui?
            throw new BadRequest(STRINGS.ACCOUNT.userExists(minUser.email));
        } else {
            const user = await this.db.createUser(minUser);

            // return auth tokens
            const accessToken = await createAccessToken(user.id, user.auth_etag)
            const refreshToken = await createRefreshToken(user.id, user.auth_etag)

            return {
                accessToken,
                refreshToken
            }
        }
    }

    @Post(API.server.signUpThroughOrg())
    async signUpThroughOrg(
        @Required() @BodyParams('orgId') orgId: string,
        @Required() @BodyParams('pendingId') pendingId: string,
        @Required() @BodyParams('user') user: ValidatedMinUser
    ) {
        const existingUsers = await this.users.find({ email: user.email });

        if (existingUsers && existingUsers.length) {
            // TO DO: loop through all existingUsers instead of just grabbing the first one
            // TO DO: make this all less brittle

            for (const org in existingUsers[0].organizations) {
                // check all of their organizations
                // to see if they belong to the inviting organization

                let userIsActiveInOrg: boolean = false;

                if (org == orgId && !!existingUsers[0].organizations[org]) {
                    // they're already active in the org <== TO DO: brittle
                    throw new BadRequest(STRINGS.ACCOUNT.userExists(user.email)); // wrong error
                }
            }
            // if we haven't thrown an error, it means they have an account 
            // but no object for the organization they've been invited to
            const theOrg = await this.db.resolveOrganization(orgId);
            const theUser = await this.db.resolveUser(existingUsers[0].id);

            // TO DO: construct user object from new information (name and roles) if provided
            // rather than just replicating what was there before

            await this.db.addUserToOrganization(theOrg, theUser, [], [], []);

            // return auth tokens <== not sure what this is doing
            const accessToken = await createAccessToken(theUser.id, theUser.auth_etag)
            const refreshToken = await createRefreshToken(theUser.id, theUser.auth_etag)

            const res = {
                accessToken,
                refreshToken
            }

            await this.pubSub.sys(PatchEventType.UserAddedToOrg, { 
                userId: theUser.id,
                orgId: orgId
            })

            return res

        } else {
            const [ _, newUser ] = await this.db.createUserThroughOrg(orgId, pendingId, user);

            // return auth tokens
            const accessToken = await createAccessToken(newUser.id, newUser.auth_etag)
            const refreshToken = await createRefreshToken(newUser.id, newUser.auth_etag)

            const res = {
                accessToken,
                refreshToken
            }

            await this.pubSub.sys(PatchEventType.UserAddedToOrg, { 
                userId: newUser.id,
                orgId: orgId
            })

            return res
        }
    }

    @Post(API.server.joinOrganization())
    async joinOrganization(
        @Required() @BodyParams('orgId') orgId: string,
        @Required() @BodyParams('pendingId') pendingId: string,
        @Required() @BodyParams('user') user: ValidatedMinUser
    ) {
        const existingUsers = await this.users.find({ email: user.email });

        if (existingUsers && existingUsers.length) {
            // TO DO: loop through all existingUsers instead of just grabbing the first one
            // TO DO: make this all less brittle

            console.log('user: ',existingUsers[0]);

            for (const org in existingUsers[0].organizations) {
                // check all of their organizations
                // to see if they belong to the inviting organization

                let userIsActiveInOrg: boolean = false;

                if (org == orgId && !!existingUsers[0].organizations[org]) {
                    // they're already active in the org <== TO DO: brittle
                    throw new BadRequest(STRINGS.ACCOUNT.userExists(user.email)); // wrong error
                }
            }
            // if we haven't thrown an error, it means they have an account 
            // but no object for the organization they've been invited to
            const theOrg = await this.db.resolveOrganization(orgId);
            const theUser = await this.db.resolveUser(existingUsers[0].id);

            // TO DO: construct user object from new information (name and roles) if provided
            // rather than just replicating what was there before

            await this.db.addUserToOrganization(theOrg, theUser, [], [], []);

            // return auth tokens <== not sure what this is doing
            const accessToken = await createAccessToken(theUser.id, theUser.auth_etag)
            const refreshToken = await createRefreshToken(theUser.id, theUser.auth_etag)

            const res = {
                accessToken,
                refreshToken
            }

            await this.pubSub.sys(PatchEventType.UserAddedToOrg, { 
                userId: theUser.id,
                orgId: orgId
            })

            return res

        } else {
            const [ _, newUser ] = await this.db.createUserThroughOrg(orgId, pendingId, user);

            // return auth tokens
            const accessToken = await createAccessToken(newUser.id, newUser.auth_etag)
            const refreshToken = await createRefreshToken(newUser.id, newUser.auth_etag)

            const res = {
                accessToken,
                refreshToken
            }

            await this.pubSub.sys(PatchEventType.UserAddedToOrg, { 
                userId: newUser.id,
                orgId: orgId
            })

            return res
        }
    }

    @Post(API.server.signIn())
    async signIn(
        @Required() @BodyParams('credentials') credentials: ValidatedBasicCredentials,
    ) {
        const user = await this.users.findOne({ email: new RegExp(credentials.email, 'i') });

        if (!user) {
          throw new Unauthorized(STRINGS.ACCOUNT.userNotFound(credentials.email))
        }
    
        if(!(user.password == credentials.password)) {
            throw new Unauthorized(STRINGS.ACCOUNT.wrongPassword)
        }

        for (const org in user.organizations) {
            console.log('orgs on sign in: ',org)
            console.log(user.organizations[org].roleIds)
            console.log(user.organizations[org].attributes)
            console.log(user.organizations[org].onDuty)
        }

        user.auth_etag = uuid.v1();
        await user.save();

        // return auth tokens
        const accessToken = await createAccessToken(user.id, user.auth_etag)
        const refreshToken = await createRefreshToken(user.id, user.auth_etag)

        return {
            accessToken,
            refreshToken
        }
    }

    @Post(API.server.signOut())
    @Authenticate()
    async signOut(@User() user: UserDoc) {
        user.auth_etag = null;

        await user.save()
    }
    
    @Post(API.server.me())
    @Authenticate()
    async me(@User() user: UserDoc) {
        return this.db.me(user);
    }

    @Post(API.server.reportLocation())
    @Authenticate()
    async reportLocation(
        @User() user: UserDoc,
        @Required() @BodyParams('locations') locations: Location[]
    ) {
        console.log(locations)
    }

    @Post(API.server.reportPushToken())
    @Authenticate()
    async reportPushToken(
        @User() user: UserDoc,
        @Required() @BodyParams('token') token: string
    ) {
        if (user.push_token != token) {
            const usersSharingPhone = await this.db.getUsers({ push_token: token });

            // make sure only one user is getting notifications on a phone at a time
            await Promise.all(usersSharingPhone.map(async (u) => {
                u.push_token = null;
                
                try {
                    await u.save()
                } catch (e) {
                    console.error(e)
                }
            }))

            user.push_token = token;
            await user.save();
        }
    }

    @Get(API.server.getSecrets())
    @Authenticate()
    async getSecrets(
        @User() user: UserDoc
    ) {
        return {
            googleMapsApiKey
        }
    }

    @Post(API.server.editMe())
    @Authenticate()
    async editMe(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @BodyParams('me') me: ValidatedMe,
        @BodyParams('protectedUser') protectedUser: ValidatedEditableUser
    ) {
        const org = await this.db.resolveOrganization(orgId);
        if ('roleIds' in protectedUser && !await userHasPermissions(user, org, [PatchPermissions.AssignRoles])) {
            throw new Unauthorized(STRINGS.ACCOUNT.noPermissionToEditRoles);
        } else if ('attributes' in protectedUser && !await userHasPermissions(user, org, [PatchPermissions.AssignAttributes])) {
            throw new Unauthorized(STRINGS.ACCOUNT.noPermissionToEditAttributes);
        }

        const res = await this.db.updateUser(orgId, user, protectedUser, me);

        await this.pubSub.sys(PatchEventType.UserEdited, { 
            userId: user.id,
            orgId
        })

        return res;
    }

    @Post(API.server.editUser())
    @RequireSomePermissions([PatchPermissions.AssignAttributes, PatchPermissions.AssignRoles])
    async editUser(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @BodyParams('userId') userId: string,
        @BodyParams('user') updatedUser: ValidatedEditableUser
    ) {
        const org = await this.db.resolveOrganization(orgId);

        if ('roleIds' in updatedUser && !await userHasPermissions(user, org, [PatchPermissions.AssignRoles])) {
            throw new Unauthorized(STRINGS.ACCOUNT.noPermissionToEditUserRoles);
        } else if ('attributes' in updatedUser && !await userHasPermissions(user, org, [PatchPermissions.AssignAttributes])) {
            throw new Unauthorized(STRINGS.ACCOUNT.noPermissionToEditUserAttributes);
        }

        const res = await this.db.updateUser(orgId, userId, updatedUser);

        await this.pubSub.sys(PatchEventType.UserEdited, { 
            userId,
            orgId
        })

        return res;
    }
}


