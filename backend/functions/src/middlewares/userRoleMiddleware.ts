import {EndpointInfo, Middleware, Req, UseBefore} from "@tsed/common";
import { StoreSet, useDecorators } from "@tsed/core";
import { BadRequest, Forbidden, Unauthorized } from "@tsed/exceptions";
import { Authenticate } from "@tsed/passport";
import { UserRole } from "common/models";
import API from "common/api";
import { MongooseDocument } from "@tsed/mongoose";
import { UserDoc, UserModel } from "../models/user";
import { User } from "../protocols/jwtProtocol";

@Middleware()
export class RequireRoleMiddleware {
  use(
    @Req() req: Req, 
    @EndpointInfo() endpoint: EndpointInfo,
    @User() user: UserDoc
  ) {
    const { roles }: { roles: UserRole[] } =  endpoint.get(RequireRoleMiddleware);

    if (!user) {
      throw new Unauthorized('You must be signed in to call this api');
    } else if ((!roles) || (!roles.length)) {
      // api not restriced to allow access
      return;
    } else {
      const unmetRoles = [];
      const orgId = req.header(API.orgIdHeader);

      if (!orgId) {
        throw new BadRequest(`No org scope supplied`);
      }

      for (const role of roles) {
        const orgConfig = user.organizations && user.organizations[orgId];

        if (!orgConfig) {
          throw new Forbidden(`You do not have access to the supplied org scope`);
        }

        const orgRoles = orgConfig.roles;

        if (!orgRoles.includes(role)) {
          unmetRoles.push(role);
        }
      }

      if (unmetRoles.length) {
        // throw unauthorized for roles...
        throw new Forbidden(`Roles [${unmetRoles.map(r => UserRole[r])}] are required to call this api`);
      } else {
        //met role requirements so allow access
        return;
      }
    }
  }
}

type OrgScopedMethod = TypedPropertyDescriptor<(orgId: string, user: UserDoc, ...any) => Promise<any>>;

type OrgScopedAuthMethodDecorator = (target: Object, propertyKey: string | symbol, descriptor: OrgScopedMethod) => OrgScopedMethod | void

export function RequireRoles(roles: UserRole[]): OrgScopedAuthMethodDecorator {
  return useDecorators(
    StoreSet(RequireRoleMiddleware, {
      roles
    }),
    UseBefore(RequireRoleMiddleware),
    Authenticate()
  );
}