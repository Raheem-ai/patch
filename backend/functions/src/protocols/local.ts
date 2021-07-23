import {BodyParams, Inject, Req} from "@tsed/common";
import {Format, Required} from "@tsed/schema";
import {Strategy} from "passport-local";
import {Protocol, OnInstall, OnVerify} from "@tsed/passport"; 
import { UserModel } from "../models/user";
import { MongooseModel } from "@tsed/mongoose";
import { Unauthorized } from "@tsed/exceptions";


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
    @Inject(UserModel) model: MongooseModel<UserModel>

    async $onVerify(
        @Req() request: Req, 
        @BodyParams() credentials: LocalCredentials,
    ) {
        const user = await this.model.findOne({ email: credentials.email })

        if (!user) {
        throw new Unauthorized("Unauthorized user")
        }
    
        if(!(user.password == credentials.password)) {
            throw new Unauthorized("Unauthorized user")
        }

        return user;
    }

    $onInstall(strategy: Strategy): void {
        // intercept the strategy instance to adding extra configuration
    }
}