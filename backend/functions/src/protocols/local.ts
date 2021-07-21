import {BodyParams, Req} from "@tsed/common";
import {Format, Required} from "@tsed/schema";
import {Strategy} from "passport-local";
// import {Unauthorized} from "@tsed/exceptions";
import {Protocol, OnInstall, OnVerify} from "@tsed/passport"; 
// import {Inject} from "@tsed/di";
// import {UserService} from "../services/UserService"

import { User, UserRole } from 'common/models';

const dummyUser: User = {
    id: '1234',
    name: 'charlie',
    roles: [UserRole.Dispatcher, UserRole.Responder]
};

export class LocalCredentials {
  @Required()
  @Format('email')
  email: string;
  
  @Required()
  password: string;
}

@Protocol({
  name: "login",
  useStrategy: Strategy,
  settings: {
    usernameField: "email",
    passwordField: "password"
  }
})
export class LocalProtocol implements OnVerify, OnInstall {
//   @Inject(UserService)
//   private userService: UserService;

  async $onVerify(
      @Req() request: Req, 
      @BodyParams() credentials: LocalCredentials
  ) {
    // const user = await this.userService.find(credentials);

    // if (!user) {
    //    throw new Unauthorized("Unauthorized user")
    // }
 
    // if(!user.verifyPassword()) {
    //     throw new Unauthorized("Unauthorized user")
    // }

    // return user;
    return dummyUser
  }

  $onInstall(strategy: Strategy): void {
    // intercept the strategy instance to adding extra configuration
  }
}