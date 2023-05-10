import { BodyParams, Controller, Get, Inject, Post } from "@tsed/common";
import { BadRequest, Unauthorized } from "@tsed/exceptions";
import { MongooseModel, Schema } from "@tsed/mongoose";
import { Authenticate } from "@tsed/passport";
import { CollectionOf, Format, Optional, Property, Required } from "@tsed/schema";
import API from 'common/api';
import { AdminEditableUser, AuthTokens, AuthCode, BasicCredentials, CategorizedItem, EditableMe, LinkExperience, Location, MinUser, PatchEventType, PatchPermissions, PendingUser, UserRole } from "common/models";
import { createAccessToken, createRefreshToken, verifyRefreshToken } from "../auth";
import { RequireSomePermissions } from "../middlewares/userRoleMiddleware";
import { UserDoc, UserModel } from "../models/user";
import * as uuid from 'uuid';
import { APIController, OrgId } from ".";
import { OrganizationController } from "./organizationController";
import { User } from "../protocols/jwtProtocol";
import { DBManagerService } from "../services/dbManagerService";
import { PubSubService } from "../services/pubSubService";
import { userHasPermissions, getLinkUrl } from "./utils";
import config from "../config";
import STRINGS from "../../../common/strings";
import { EmailService } from "../services/emailService"; 
import { AuthCodeModel } from "../models/authCode";
import { compare } from 'bcrypt';


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

    @Optional()
    @Property()
    acceptedTOSVersion: string;
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
    | 'editMe'
    | 'editUser'
    | 'sendResetCode'
    | 'updatePassword'
    | 'deleteMyAccount'
    | 'getDynamicConfig'
> {
    @Inject(DBManagerService) db: DBManagerService;
    @Inject(UserModel) users: MongooseModel<UserModel>;
    @Inject(PubSubService) pubSub: PubSubService;
    @Inject(EmailService) emailService: EmailService;
    @Inject(AuthCodeModel) authCodes: MongooseModel<AuthCodeModel>;

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
            const [ _, existingUser ] = await this.db.acceptInviteToOrg(orgId, pendingId, existingUsers[0]);

            const accessToken = await createAccessToken(existingUser.id, existingUser.auth_etag)
            const refreshToken = await createRefreshToken(existingUser.id, existingUser.auth_etag)

            const res = {
                accessToken,
                refreshToken
            }

            await this.pubSub.sys(PatchEventType.UserAddedToOrg, { 
                userId: existingUser.id,
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
          throw new Unauthorized(STRINGS.ACCOUNT.errorMessages.userNotFound(credentials.email))
        }

        const passwordHashesMatch = await compare(credentials.password, user.password)
    
        if(!passwordHashesMatch) {
            throw new Unauthorized(STRINGS.ACCOUNT.wrongPassword)
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

    @Post(API.server.deleteMyAccount())
    @Authenticate()
    async deleteMyAccount(@User() user: UserDoc) {
        return this.db.deleteUser(user);
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

    @Get(API.server.getDynamicConfig())
    @Authenticate()
    async getDynamicConfig(
        @User() user: UserDoc
    ) {
        return this.db.getDynamicConfig()
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

    @Post(API.server.updatePassword())
    @Authenticate()
    async updatePassword(
        @User() user: UserDoc,
        @Required() @BodyParams('password') password: string,
        @BodyParams('resetCode') resetCode?: string,
    ) {
        const res = await this.db.updateUserPassword(user, password);

        if (!!resetCode) {
            await this.db.deleteAuthCode(resetCode);
        }
    }

    @Post(API.server.sendResetCode())
    async sendResetCode(
        @Required() @BodyParams('email') email: string,
        @Required() @BodyParams('baseUrl') baseUrl: string,
    ) {
        const user = await this.users.findOne({ email: new RegExp(email, 'i') });

        if (!user) {
            return
        }

        const code = await this.db.createAuthCode(user.id);
        const link = getLinkUrl(baseUrl, LinkExperience.ResetPassword, {code});

        await this.emailService.sendResetPasswordEmail(link, email, user.name);
    }

    @Post(API.server.signInWithCode())
    async signInWithCode(
        @Required() @BodyParams('code') code: string,
    ) {
        const authCodeObject = await this.authCodes.findOne({ code: code });

        if (!authCodeObject) {
            throw new Unauthorized(STRINGS.ACCOUNT.errorMessages.badResetPasswordCode());
        }

        // check if the code is still good
        const validMilliseconds = 1000*60*60*24; // one day = 1000*60*60*24 milliseconds
        const codeCreatedAt = Date.parse(authCodeObject.createdAt);
        const elapsedMilliseconds = (Date.now() - codeCreatedAt);

        if (elapsedMilliseconds > validMilliseconds) {
            throw new Unauthorized(STRINGS.ACCOUNT.errorMessages.badResetPasswordCode());
        }

        const user = await this.users.findById(authCodeObject.userId);

        if (!user) {
            throw new Unauthorized(STRINGS.ACCOUNT.errorMessages.userNotFound(code))
        }

        user.auth_etag = uuid.v1();
        await user.save();

        // return auth tokens
        const accessToken = await createAccessToken(user.id, user.auth_etag);
        const refreshToken = await createRefreshToken(user.id, user.auth_etag);

        return {
            accessToken,
            refreshToken
        }
    }
}