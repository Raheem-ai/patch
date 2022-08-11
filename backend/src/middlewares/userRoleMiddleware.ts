import {Context, EndpointInfo, Inject, Middleware, Req, UseBefore} from "@tsed/common";
import { StoreSet, useDecorators } from "@tsed/core";
import { BadRequest, Forbidden, Unauthorized } from "@tsed/exceptions";
import { Authenticate } from "@tsed/passport";
import { PatchPermissions, UserRole } from "common/models";
import API from "common/api";
import { UserDoc } from "../models/user";
import { User } from "../protocols/jwtProtocol";
import { resolvePermissionsFromRoles } from "common/utils/permissionUtils";
import { DBManager } from "../services/dbManager";
import STRINGS from "common/strings";

@Middleware()
export class RequirePermissionsMiddleware {
  @Inject(DBManager) db: DBManager;

  async use(
    @Req() req: Req, 
    @Context() ctx: Context,
    @User() user: UserDoc
  ) {
    const endpoint = ctx.endpoint;
    const { requiredPermissions, allRequired }: { 
        requiredPermissions: PatchPermissions[],
        allRequired: boolean
    } = endpoint.get(RequirePermissionsMiddleware);

    if (!user) {
      throw new Unauthorized(STRINGS.ACCOUNT.signInForAPI);
    } else if ((!requiredPermissions) || (!requiredPermissions.length)) {
      // api not restriced so allow access
      return;
    } else {
      const orgId = req.header(API.orgIdHeader);

      if (!orgId) {
        throw new BadRequest(STRINGS.ACCOUNT.noOrgScope);
      }

      const orgConfig = user.organizations && user.organizations[orgId];

      if (!orgConfig) {
        throw new Forbidden(STRINGS.ACCOUNT.noOrgAccess);
      }

      // TODO: create @Org decorator to pass the resolved org through
      const org = await this.db.resolveOrganization(orgId);

      const userRoles = orgConfig.roleIds
        .map(roleId => org.roleDefinitions.find(def => def.id == roleId))
        .filter(x => !!x)

      const userPermissions = resolvePermissionsFromRoles(userRoles)

      const satisfiesPermissions = allRequired
          ? requiredPermissions.every(perm => userPermissions.has(perm))
          : requiredPermissions.some(perm => userPermissions.has(perm))

      if (satisfiesPermissions) {
        return;
      }

      const errorMessage = allRequired
          ? `Permissions [${requiredPermissions.map(p => PatchPermissions[p])}] are required to call this api`
          : `At least one of the following permissions are required to call thos api [${requiredPermissions.map(p => PatchPermissions[p])}]`

      throw new Forbidden(errorMessage);      
    }
  }
}

type OrgScopedMethod = TypedPropertyDescriptor<(orgId: string, user: UserDoc, ...any) => Promise<any>>;

type OrgScopedAuthMethodDecorator = (target: Object, propertyKey: string | symbol, descriptor: OrgScopedMethod) => OrgScopedMethod | void

export function RequireAllPermissions(requiredPermissions: PatchPermissions[]): OrgScopedAuthMethodDecorator {
  return useDecorators(
    StoreSet(RequirePermissionsMiddleware, {
      requiredPermissions,
      allRequired: true
    }),
    UseBefore(RequirePermissionsMiddleware),
    Authenticate()
  );
}

export function RequireSomePermissions(requiredPermissions: PatchPermissions[]): OrgScopedAuthMethodDecorator {
  return useDecorators(
    StoreSet(RequirePermissionsMiddleware, {
      requiredPermissions
    }),
    UseBefore(RequirePermissionsMiddleware),
    Authenticate()
  );
}