import { BodyParams, Controller, Get, Inject, Post } from "@tsed/common";
import { BadRequest, Unauthorized } from "@tsed/exceptions";
import { MongooseModel, Schema } from "@tsed/mongoose";
import { Authenticate } from "@tsed/passport";
import { CollectionOf, Format, Optional, Property, Required } from "@tsed/schema";
import API from 'common/api';
import { AdminEditableUser, BasicCredentials, CategorizedItem, EditableMe, Location, MinUser, PatchEventType, PatchPermissions } from "common/models";
import { createAccessToken, createRefreshToken, verifyRefreshToken } from "../auth";
import { RequireSomePermissions } from "../middlewares/userRoleMiddleware";
import { UserDoc, UserModel } from "../models/user";
import * as uuid from 'uuid';
import { APIController, OrgId } from ".";
import { User } from "../protocols/jwtProtocol";
import { DBManager } from "../services/dbManager";
import { PubSubService } from "../services/pubSubService";
import { userHasPermissions } from "./utils";
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
            throw new BadRequest(STRINGS.ACCOUNT.userExists(user.email));
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
            // TODO: this should come from the secret store but it's currently already in source 
            // in 'app.json' of the front end so punting on this until we generate dynamic front end config
            // and set up CI/CD for front end deployments (https://docs.expo.dev/guides/setting-up-continuous-integration/)
            googleMapsApiKey: 'AIzaSyDVdpoHZzD9G5EdsNDEg6CG3hnE4q4zbhw'
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


