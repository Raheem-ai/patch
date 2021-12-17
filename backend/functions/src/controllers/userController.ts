import { BodyParams, Controller, Get, Inject, Post, Req } from "@tsed/common";
import { BadRequest, Unauthorized } from "@tsed/exceptions";
import { MongooseModel } from "@tsed/mongoose";
import { Authenticate, Authorize } from "@tsed/passport";
import { Enum, Format, Optional, Property, Required } from "@tsed/schema";
import API from 'common/api';
import { BasicCredentials, EditableMe, EditableUser, Location, Me, MinUser, ProtectedUser, RequestSkill, UserRole } from "common/models";
import { createAccessToken, createRefreshToken, JWTMetadata, verifyRefreshToken } from "../auth";
import { RequireRoles } from "../middlewares/userRoleMiddleware";
import { UserDoc, UserModel } from "../models/user";
import * as uuid from 'uuid';
import { APIController, OrgId } from ".";
import { User } from "../protocols/jwtProtocol";
import { DBManager } from "../services/dbManager";
import config from '../config';

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

export class ValidatedEditableUser implements Partial<EditableUser> {
    @Optional()
    @Property()
    @Enum(RequestSkill)
    skills: RequestSkill[]
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

            return {
                accessToken,
                refreshToken
            }
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
        @User() user: UserDoc,
        @BodyParams('me') me: ValidatedMe
    ) {
        return await this.db.updateUser(user, me);
    }

    @Post(API.server.editUser())
    @RequireRoles([UserRole.Admin])
    async editUser(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @BodyParams('userId') userId: string,
        @BodyParams('user') updatedUser: ValidatedEditableUser
    ) {
        return await this.db.updateUser(userId, updatedUser);
    }

}


