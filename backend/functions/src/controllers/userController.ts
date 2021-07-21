import {BodyParams, Controller, Get, Post, Req} from "@tsed/common";
import { Authenticate } from "@tsed/passport";
import { APIRoutes } from '../../../../common/api';

@Controller('/users')
export class UsersController {
  
    @Get('/test')
    async test(): Promise<string> {
        return 'hellow world'
    }

    @Post(APIRoutes.signIn())
    @Authenticate("login")
    login(
        @Req() req: Req, 
        @BodyParams("email") email: string, 
        @BodyParams("password") password: string
    ) {
        // FACADE
        return req.user;
    }

}