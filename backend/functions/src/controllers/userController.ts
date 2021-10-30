import { BodyParams, Controller, Inject, Post, Req } from "@tsed/common";
import { BadRequest, Unauthorized } from "@tsed/exceptions";
import { MongooseModel } from "@tsed/mongoose";
import { Authenticate, Authorize } from "@tsed/passport";
import { Format, Required } from "@tsed/schema";
import API from 'common/api';
import { BasicCredentials, Location, MinUser } from "common/models";
import { createAccessToken, createRefreshToken, JWTMetadata } from "../auth";
import { RequireRoles } from "../middlewares/userRoleMiddleware";
import { UserDoc, UserModel } from "../models/user";
import * as uuid from 'uuid';
import { APIController } from ".";
import { User } from "../protocols/jwtProtocol";
import { DBManager } from "../services/dbManager";
import { decode, Jwt, verify } from "jsonwebtoken";
import config from '../config';

export class ValidatedMinUser implements MinUser {
    @Required()
    @Format('email')
    email: string;
    
    @Required()
    password: string;
}

export class ValidatedBasicCredentials implements BasicCredentials {
    @Required()
    @Format('email')
    email: string;
    
    @Required()
    password: string;
}

const refreshTokenSecrets = config.SESSION.get().refreshTokenSecrets;

@Controller(API.namespaces.users)
export class UsersController implements APIController<'signUp' | 'signIn' | 'signOut' | 'reportLocation' | 'reportPushToken' | 'me' | 'refreshAuth'> {
    @Inject(DBManager) db: DBManager;
    @Inject(UserModel) users: MongooseModel<UserModel>;

    @Post(API.server.refreshAuth())
    async refreshAuth(
        @Required() @BodyParams('refreshToken') refreshToken: string
    ) {
        const decodedRefreshToken = decode(refreshToken, { complete: true });

        if (!decodedRefreshToken) {
            throw new BadRequest(`malformed refresh token: ${refreshToken}`)
        }

        const secret = refreshTokenSecrets.find(s => s.kid == decodedRefreshToken.header.kid);

        if (!secret) {
            throw new BadRequest(`key not found: ${decodedRefreshToken.header.kid}`)
        }

        const refreshTokenPayload = await new Promise<JWTMetadata>((resolve, _) => {
            verify(refreshToken, secret.value, { complete: true }, (err, jwt: Jwt) => {
                if (err) {
                    console.error(err);
                    resolve(null)
                } else {
                    resolve(jwt.payload as JWTMetadata)
                }
            });
        })

        if (!refreshTokenPayload) {
            throw new BadRequest(`couldn't verify refresh token`);
        }

        // TODO: figure this out
        // this might actually already work cuz the 'expiresIn' field is build into the
        // jsonwebtoken lib along with verify which has an 'ignoreExpiration' option
        const alreadyExpired = false;

        if (alreadyExpired) {
            throw new BadRequest('refresh token has expired')
        }

        const userId = refreshTokenPayload.userId;

        const user = await this.users.findById(userId);

        if (!user) {
            throw new BadRequest(`couldn't find token user`)
        }

        if (user.auth_etag != refreshTokenPayload.etag) {
            throw new BadRequest(`etags don't match`)
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
            user.push_token = token;
            await user.save();
        }
    }

}