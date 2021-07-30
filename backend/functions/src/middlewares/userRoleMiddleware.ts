import {EndpointInfo, Middleware, Req, UseBefore} from "@tsed/common";
import { StoreSet, useDecorators } from "@tsed/core";
import { Forbidden, Unauthorized } from "@tsed/exceptions";
import { Authorize } from "@tsed/passport";
import { User, UserRole } from "common/models";

@Middleware()
export class RequireRoleMiddleware {
  use(@Req() req: Req, @EndpointInfo() endpoint: EndpointInfo) {
    const user = req.user as User;
    const params =  endpoint.get(RequireRoleMiddleware);

    if (!user) {
      throw new Unauthorized('You must be signed in to call this api');
    } else if ((!params.roles) || (!params.roles.length)) {
      // api not restriced to allow access
      return;
    } else {
      const unmetRoles = [];

      for (const role of params.roles) {
        if (!user.roles.includes(role)) {
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
    Authorize(),
    StoreSet(RequireRoleMiddleware, {
      roles
    }),
    UseBefore(RequireRoleMiddleware)
  );
}