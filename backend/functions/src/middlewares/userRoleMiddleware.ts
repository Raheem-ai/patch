import {EndpointInfo, Middleware, Req, UseBefore} from "@tsed/common";
import { StoreSet, useDecorators } from "@tsed/core";
import { BadRequest, Forbidden, Unauthorized } from "@tsed/exceptions";
import { Authenticate } from "@tsed/passport";
import { User, UserRole } from "common/models";
import API from "common/api";

@Middleware()
export class RequireRoleMiddleware {
  use(@Req() req: Req, @EndpointInfo() endpoint: EndpointInfo) {
    const user = req.user as User;
    const { roles }: { roles: UserRole[] } =  endpoint.get(RequireRoleMiddleware);

    if (!user) {
      throw new Unauthorized('You must be signed in to call this api');
    } else if ((!roles) || (!roles.length)) {
      // api not restriced to allow access
      return;
    } else {
      const unmetRoles = [];
      const orgId = req.header(API.orgIDHeader);

      if (!orgId) {
        throw new BadRequest(`No org scope supplied`);
      }

      for (const role of roles) {
        const orgConfig = user.organizations && user.organizations.get(orgId);

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

export function RequireRoles(roles: UserRole[]): MethodDecorator {
  return useDecorators(
    Authenticate(),
    StoreSet(RequireRoleMiddleware, {
      roles
    }),
    UseBefore(RequireRoleMiddleware)
  );
}