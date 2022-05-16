import { BodyParams, Controller, Get, Inject, Post, Req } from "@tsed/common";
import { BadRequest, Forbidden, Unauthorized } from "@tsed/exceptions";
import { MongooseModel } from "@tsed/mongoose";
import { Authenticate, Authorize } from "@tsed/passport";
import { Enum, Format, Optional, Property, Required } from "@tsed/schema";
import API from 'common/api';
import { AdminEditableUser, BasicCredentials, CategorizedItem, EditableMe, EditableUser, Location, Me, MinUser, PatchEventType, PatchPermissions, ProtectedUser, RequestSkill, resolvePermissionsFromRoles, UserRole } from "common/models";
import { createAccessToken, createRefreshToken, JWTMetadata, verifyRefreshToken } from "../auth";
import { RequireRoles } from "../middlewares/userRoleMiddleware";
import { UserDoc, UserModel } from "../models/user";
import * as uuid from 'uuid';
import { APIController, OrgId } from ".";
import { User } from "../protocols/jwtProtocol";
import { DBManager } from "../services/dbManager";
import config from '../config';
import { PubSubService } from "../services/pubSubService";
import { OrganizationDoc } from "../models/organization";

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

export class ValidatedEditableUser implements Partial<AdminEditableUser> {
    @Optional()
    @Property()
    @Enum(RequestSkill)
    skills: RequestSkill[]
    roleIds: string[]
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

const refreshTokenSecrets = config.SESSION.get().refreshTokenSecrets;

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
            throw new BadRequest(`User with email: ${minUser.email} already exists`);
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
            throw new BadRequest(`User with email: ${user.email} already exists`);
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
        const user = await this.users.findOne({ email: credentials.email });

        if (!user) {
          throw new Unauthorized(`User with email '${credentials.email}' not found`)
        }
    
        if(!(user.password == credentials.password)) {
            throw new Unauthorized(`Wrong password`)
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
        @BodyParams('protectedUser') protectedUser: AdminEditableUser
    ) {
        if ('roleIds' in protectedUser && !await this.userHasPermissions(user, orgId, [PatchPermissions.AssignRoles])) {
            throw new Unauthorized('You do not have permission to edit Roles associated with your profile.');
        } else if ('attributes' in protectedUser && !await this.userHasPermissions(user, orgId, [PatchPermissions.AssignAttributes])) {
            throw new Unauthorized('You do not have permission to edit Attributes associated with your profile.');
        }

        const res = await this.db.updateUser(orgId, user, protectedUser, me);

        await this.pubSub.sys(PatchEventType.UserEdited, { 
            userId: user.id,
        })

        return res;
    }

    @Post(API.server.editUser())
    @RequireRoles([UserRole.Admin])
    async editUser(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @BodyParams('userId') userId: string,
        @BodyParams('user') updatedUser: AdminEditableUser
    ) {
        if ('roleIds' in updatedUser && !await this.userHasPermissions(user, orgId, [PatchPermissions.AssignRoles])) {
            throw new Unauthorized("You do not have permission to edit Roles associated with this user's profile.");
        } else if ('attributes' in updatedUser && !await this.userHasPermissions(user, orgId, [PatchPermissions.AssignAttributes])) {
            throw new Unauthorized("You do not have permission to edit Attributes associated with this user's profile.");
        }

        const res = await this.db.updateUser(orgId, userId, updatedUser);

        await this.pubSub.sys(PatchEventType.UserEdited, { 
            userId,
        })

        return res;
    }

    // TODO: copied from organizationController. Where is a central location we can put this?
    async userHasPermissions(user: UserDoc, orgId: string | OrganizationDoc, requiredPermissions: PatchPermissions[]): Promise<boolean> {
        const org = await this.db.resolveOrganization(orgId);

        const orgConfig = user.organizations && user.organizations[org.id];
        if (!orgConfig) {
            throw new Forbidden(`You do not have access to the requested org.`);
        }

        // Get all the roles that belong to a user.
        const userRoles = [];
        orgConfig.roleIds.forEach(id => {
            const assignedRole = org.roleDefinitions.find(
                roleDef => roleDef.id == id
            );    
            if (assignedRole) {
                userRoles.push(assignedRole);
            }
        });

        // Resolve all the permissions granted to a user based on their role(s).
        const userPermissions = resolvePermissionsFromRoles(userRoles);
        for (const permission of requiredPermissions) {
            // If any required permission is missing, return false.
            if (!userPermissions.has(permission as PatchPermissions)) {
                return false;
            }
        }

        // If we make it here then all required permissions were found.
        return true;
    }
}


