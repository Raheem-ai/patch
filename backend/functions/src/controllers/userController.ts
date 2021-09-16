import { BodyParams, Controller, Inject, Post, Req } from "@tsed/common";
import { BadRequest, Unauthorized } from "@tsed/exceptions";
import { MongooseDocument, MongooseModel } from "@tsed/mongoose";
import { Authenticate, Authorize } from "@tsed/passport";
import { Format, Required } from "@tsed/schema";
import API from 'common/api';
import { BasicCredentials, Location, MinUser, UserRole } from "common/models";
import { createJWT } from "../auth";
import { RequireRoles } from "../middlewares/userRoleMiddleware";
import { UserDoc, UserModel } from "../models/user";
import * as uuid from 'uuid';
import { APIController } from ".";
import { User } from "../protocols/jwtProtocol";

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

@Controller(API.namespaces.users)
export class UsersController implements APIController<'signUp' | 'signIn' | 'signOut' | 'reportLocation' | 'reportPushToken' | 'me'> {
    @Inject(UserModel) users: MongooseModel<UserModel>;

    @Post(API.server.signUp())
    async signUp(
        @Required() @BodyParams('user') minUser: ValidatedMinUser
    ) {
        const existingUsers = await this.users.find({ email: minUser.email });

        if (existingUsers && existingUsers.length) {
            // TODO: should this throw for a notification in the ui?
            throw new BadRequest(`User with email: ${minUser.email} already exists`);
        } else {
            const user = new this.users(minUser);

            user.auth_etag = uuid.v1();

            await user.save()

            // return auth token
            const token = await createJWT(user.id, user.auth_etag)

            return token;
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

        // create + add jwt token
        const token = await createJWT(user.id, user.auth_etag);

        return token;
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
        const pubUser = user.toJSON();

        // strip private fields off here so all other server side apis can have access to
        // them with the initial call to the db to check auth
        for (const key in UserModel.systemProperties) {
            pubUser[key] = undefined
        }

        return pubUser;
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