import {Context, EndpointInfo, Inject, Middleware, PlatformContext, Req, UseBefore} from "@tsed/common";
import { StoreSet, useDecorators } from "@tsed/core";
import { BadRequest, Forbidden, Unauthorized } from "@tsed/exceptions";
import { Authenticate } from "@tsed/passport";
import { PatchPermissions, UserRole } from "common/models";
import API from "common/api";
import { DBManager } from "../services/dbManager";
import { HelpRequestDoc } from "../models/helpRequest";
import { UserDoc } from "../models/user";
import { User } from "../protocols/jwtProtocol";
import { resolvePermissionsFromRoles } from "common/utils/permissionUtils";
import { userOnRequest } from "common/utils/requestUtils";

const HelpRequestContextKey = 'helpRequest';

@Middleware()
export class RequestAccessMiddleware {
  @Inject(DBManager) db: DBManager;

  async use(
      @Req() req: Req, 
      @Context() context: PlatformContext,
      @User() user: UserDoc
  ) {

    const endpoint = context.endpoint;

    const { requiredPermissions, requireBeingOnRequest }: { 
        requiredPermissions: PatchPermissions[],
        requireBeingOnRequest: boolean
    } = endpoint.get(RequestAccessMiddleware);

    const orgId = req.header(API.orgIdHeader);
    const requestId = req.header(API.requestIdHeader);

    if (!orgId) {
      throw new BadRequest(`No org scope supplied`);
    }

    if (!requestId) {
      throw new BadRequest(`No request scope supplied`);
    }

    const orgConfig = user.organizations && user.organizations[orgId];

    if (!orgConfig) {
      throw new Forbidden(`You do not have access to the supplied org scope`);
    }

    const request = await this.db.resolveRequest(requestId);
    const org = await this.db.resolveOrganization(orgId);

    const userRoles = orgConfig.roleIds
        .map(roleId => org.roleDefinitions.find(def => def.id == roleId))
        .filter(x => !!x)

    const userPermissions = resolvePermissionsFromRoles(userRoles)

    if (userPermissions.has(PatchPermissions.RequestAdmin)) {
        context.set(HelpRequestContextKey, request);
        return; // request admins of an org have access to all apis on all requests
    } else if (requiredPermissions.every(perm => userPermissions.has(perm))) {
        if (requireBeingOnRequest && !userOnRequest(user.id, request)) {
          throw new Forbidden('You must be on a request to do this action')
        }

        context.set(HelpRequestContextKey, request);
        return;
    }

    throw new Forbidden(`You do not have the required permissions.`);
  }
}

type RequestScopedMethod = TypedPropertyDescriptor<(orgId: string, user: UserDoc, request: HelpRequestDoc, ...any) => Promise<any>>;

type RequestScopedAuthMethodDecorator = (target: Object, propertyKey: string | symbol, descriptor: RequestScopedMethod) => RequestScopedMethod

export function RequestAdminOrOnRequestWithPermissions(requiredPermissions: PatchPermissions[]): RequestScopedAuthMethodDecorator {
  return useDecorators(
    StoreSet(RequestAccessMiddleware, {
      requiredPermissions,
      requireBeingOnRequest: true
    }),
    UseBefore(RequestAccessMiddleware),
    Authenticate()
  );
}

export function RequestAdminOrWithPermissions(requiredPermissions: PatchPermissions[]): RequestScopedAuthMethodDecorator {
  return useDecorators(
    StoreSet(RequestAccessMiddleware, {
      requiredPermissions
    }),
    UseBefore(RequestAccessMiddleware),
    Authenticate()
  );
}

export function HelpReq(): ParameterDecorator {
    return Context(HelpRequestContextKey);
}