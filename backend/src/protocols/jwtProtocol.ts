import {Context, Inject, Req, Res} from "@tsed/common";
import { MongooseModel } from "@tsed/mongoose";
import {Arg, OnVerify, Protocol} from "@tsed/passport";
import {ExtractJwt, Strategy, StrategyOptions} from "passport-jwt";
import { decode } from 'jsonwebtoken';
import { getPrivateKeySecret, getPubKeySecret, JWTMetadata } from "../auth";
import { UserModel } from "../models/user";
import config from '../config';
import { Unauthorized } from "@tsed/exceptions";
import STRINGS from "common/strings";
import { readFileSync } from "fs";
import jose from 'node-jose'

const accessTokenSecrets = config.SESSION.get().accessTokenSecrets;
const UserContextKey = 'AuthorizedUser';

const secretOrKeyProvider = async (req, token, done) => {
    const decodedToken = decode(token, { complete: true });

    if (!decodedToken) {
      done(`Error: malformed token: ${decodedToken}`, null)
        return
    }

    try {
      const pubKey = await getPubKeySecret(decodedToken.header.kid)
      done(null, pubKey.value);
    } catch (e) {
      done(e, null)
    }
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
          return verifiedUser
        } else {
          throw new Unauthorized(STRINGS.ACCOUNT.unauthorized)
        }
    }
}

export function User(): ParameterDecorator {
  return Context(UserContextKey);
}