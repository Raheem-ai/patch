import { BodyParams, Controller, Inject, Post, Req } from "@tsed/common";
import { MongooseModel } from "@tsed/mongoose";
import { Authenticate } from "@tsed/passport";
import { Required } from "@tsed/schema";
import API from 'common/api';
import { UserModel } from "../models/user";
import { LocalCredentials } from "../protocols/local";

@Controller(API.namespaces.users)
export class UsersController {
    @Inject(UserModel) users: MongooseModel<UserModel>;

    @Post(API.server.signUp())
    async signup(
        @Required() @BodyParams() credentials: LocalCredentials
    ) {
        const existingUsers = await this.users.find({ email: credentials.email });

        if (existingUsers && existingUsers.length) {
            return existingUsers[0].toJSON()
        } else {
            const user = new this.users(credentials);
            await user.save()

            return user.toJSON()
        }
    }

    @Post(API.server.signIn())
    @Authenticate("login")
    login() {
        // FACADE
        // sets up session cookie and returns user json
    }

    @Post(API.server.signOut())
    logout(@Req() req: Req) {
        req.logout();
        req.session.destroy(() => {});
    }

}