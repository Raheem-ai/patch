import {Controller, Post, Req} from "@tsed/common";
import { Authenticate } from "@tsed/passport";
import { APIRoutes } from 'common/api';

@Controller('/users')
export class UsersController {

    @Post(APIRoutes.signIn())
    @Authenticate("login")
    login() {
        // FACADE
        // sets up session cookie and returns user json
    }

    @Post(APIRoutes.signOut())
    logout(@Req() req: Req) {
        req.logout();
        req.session.destroy(() => {});
    }

}