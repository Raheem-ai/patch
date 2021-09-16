import {Context, Inject, Req} from "@tsed/common";
import { MongooseModel } from "@tsed/mongoose";
import {Arg, OnVerify, Protocol} from "@tsed/passport";
import {ExtractJwt, Strategy, StrategyOptions} from "passport-jwt";
import { decode } from 'jsonwebtoken';
import { JWTMetadata } from "../auth";
import { UserModel } from "../models/user";
import config from '../config';

const jwtSecrets = config.SESSION.get().secrets;
const UserContextKey = 'AuthorizedUser';

const secretOrKeyProvider = (req, token, done) => {
    const decodedToken = decode(token, { complete: true });

    if (!decodedToken) {
      done(`Error: malformed token: ${decodedToken}`, null)
        return
    }

    const secret = jwtSecrets.find(s => s.kid == decodedToken.header.kid);

    if (!secret) {
        done(`Error: key not found: ${decodedToken.header.kid}`, null)
        return
    }

    done(null, secret.value);
}

@Protocol<StrategyOptions>({
  name: "jwt",
  useStrategy: Strategy,
  settings: {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKeyProvider: secretOrKeyProvider
  }
})
export class JwtProtocol implements OnVerify {
    @Inject(UserModel) model: MongooseModel<UserModel>

    async $onVerify(
      @Req() req: Req, 
      @Arg(0) jwtPayload: JWTMetadata,
      @Context() ctx: Context
    ) {
        const user = await this.model.findById(jwtPayload.userId);

        const verifiedUser = (user && (user.auth_etag == jwtPayload.etag)) ? user : false;

        if (verifiedUser) {
          ctx.set(UserContextKey, verifiedUser);
        }

        return verifiedUser;
    }
}

export function User(): ParameterDecorator {
  return Context(UserContextKey);
}