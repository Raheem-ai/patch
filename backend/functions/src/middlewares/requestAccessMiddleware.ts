import {Context, EndpointInfo, Inject, Middleware, PlatformContext, Req, UseBefore} from "@tsed/common";
import { StoreSet, useDecorators } from "@tsed/core";
import { BadRequest, Forbidden, Unauthorized } from "@tsed/exceptions";
import { Authenticate } from "@tsed/passport";
import { UserRole } from "common/models";
import API from "common/api";
import { DBManager } from "../services/dbManager";
import { MongooseDocument } from "@tsed/mongoose";
import { HelpRequestDoc, HelpRequestModel } from "../models/helpRequest";
import { UserDoc } from "../models/user";
import { User } from "../protocols/jwtProtocol";

const HelpRequestContextKey = 'helpRequest';

@Middleware()
export class RequestAccessMiddleware {
  @Inject(DBManager) db: DBManager;

  async use(
      @Req() req: Req, 
      @Context() context: PlatformContext,
      @User() user: UserDoc
  ) {
    const orgId = req.header(API.orgIdHeader);
    const requestId = req.header(API.requestIdHeader);

    if (!orgId) {
      throw new BadRequest(`No org scope supplied`);
    }

    if (!requestId) {
      throw new BadRequest(`No request scope supplied`);
    }

    const orgConfig = user.organizations && user.organizations.get(orgId);

    if (!orgConfig) {
      throw new Forbidden(`You do not have access to the supplied org scope`);
    }

    const orgRoles = orgConfig.roles;

    if (orgRoles.includes(UserRole.Dispatcher)) {
        return; // dispatchers of an org have access to all apis on all requests
    } else if (orgRoles.includes(UserRole.Responder)) {
        const request = await this.db.resolveRequest(requestId);
        const hasAccess = request.responderIds.includes(user.id);

        if (!hasAccess) {
          throw new Forbidden(`You do not have access to the this request`);
        } else {
          context.set(HelpRequestContextKey, request);
          return
        }
    }

    throw new Forbidden(`Must be a Dispatcher or a Responder assigned to the target request request to call this api`);
    
  }
}

type RequestScopedMethod = TypedPropertyDescriptor<(orgId: string, user: UserDoc, request: HelpRequestDoc, ...any) => Promise<any>>;

type RequestScopedAuthMethodDecorator = (target: Object, propertyKey: string | symbol, descriptor: RequestScopedMethod) => RequestScopedMethod

export function RequestAccess(): RequestScopedAuthMethodDecorator {
  return useDecorators(
    Authenticate(),
    UseBefore(RequestAccessMiddleware)
  );
}

export function HelpReq(): ParameterDecorator {
    return Context(HelpRequestContextKey);
}