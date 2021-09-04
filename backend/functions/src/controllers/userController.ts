import { BodyParams, Controller, Inject, Post, Req } from "@tsed/common";
import { Unauthorized } from "@tsed/exceptions";
import { MongooseDocument, MongooseModel } from "@tsed/mongoose";
import { Authenticate, Authorize } from "@tsed/passport";
import { Format, Required } from "@tsed/schema";
import API from 'common/api';
import { User, UserRole } from "common/models";
import { createJWT } from "../auth";
import { RequireRoles } from "../middlewares/userRoleMiddleware";
import { UserModel } from "../models/user";
import * as uuid from 'uuid';

export class LocalCredentials {
    @Required()
    @Format('email')
    email: string;
    
    @Required()
    password: string;
}

@Controller(API.namespaces.users)
export class UsersController {
    @Inject(UserModel) users: MongooseModel<UserModel>;

    @Post(API.server.signUp())
    async signup(
        @Required() @BodyParams() credentials: LocalCredentials
    ) {
        const existingUsers = await this.users.find({ email: credentials.email });

        if (existingUsers && existingUsers.length) {
            // TODO: should this throw for a notification in the ui?
            return existingUsers[0].toJSON()
        } else {
            const user = new this.users(credentials);
            user.auth_etag = uuid.v1();

            await user.save()

            // return auth token
            const token = await createJWT(user.id, user.auth_etag)

            return token;
        }
    }

    @Post(API.server.signIn())
    async login(
        @Req() request: Req, 
        @BodyParams() credentials: LocalCredentials,
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
    async logout(@Req() req: Req) {
        const user: MongooseDocument<UserModel> = req.user as any;
        user.auth_etag = null;

        await user.save()
    }
    
    @Post(API.server.me())
    @Authenticate()
    me(@Req() req: Req) {
        const user = req.user as MongooseDocument<UserModel>;
        const pubUser = user.toJSON();

        // strip private fields off here so all other server side apis can have access to
        // them with the initial call to the db to check auth
        for (const key in UserModel.privateProperties) {
            pubUser[key] = undefined
        }

        return pubUser;
    }

    @Post(API.server.reportLocation())
    @RequireRoles([UserRole.Responder])
    reportLocation(
        @Required() @BodyParams('locations') locations: Location[]
    ) {
        console.log(locations)
    }

    @Post(API.server.reportPushToken())
    @Authenticate()
    async reportPushToken(
        @Required() @BodyParams('token') token: string,
        @Req() req: Req
    ) {
        const user: MongooseDocument<UserModel> = req.user as any;

        if (user.push_token != token) {
            user.push_token = token;
            await user.save();
        }
    }

}