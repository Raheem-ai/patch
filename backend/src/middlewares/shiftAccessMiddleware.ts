import {Context, EndpointInfo, Inject, Middleware, PlatformContext, Req, UseBefore} from "@tsed/common";
import { StoreSet, useDecorators } from "@tsed/core";
import { BadRequest, Forbidden, Unauthorized } from "@tsed/exceptions";
import { Authenticate } from "@tsed/passport";
import { PatchPermissions, UserRole } from "common/models";
import API from "common/api";
import { DBManagerService } from "../services/dbManagerService";
import { ShiftDoc } from "../models/shift";
import { UserDoc } from "../models/user";
import { User } from "../protocols/jwtProtocol";
import { resolvePermissionsFromRoles } from "common/utils/permissionUtils";
import { userOnShiftOccurrence } from "common/utils/shiftUtils";

const ShiftContextKey = 'shift';

@Middleware()
export class ShiftAccessMiddleware {
  @Inject(DBManagerService) db: DBManagerService;

  async use(
      @Req() req: Req, 
      @Context() context: PlatformContext,
      @User() user: UserDoc
  ) {
    const endpoint = context.endpoint;

    const { requiredPermissions, requireBeingOnShift }: { 
        requiredPermissions: PatchPermissions[],
        requireBeingOnShift: boolean
    } = endpoint.get(ShiftAccessMiddleware);

    const orgId = req.header(API.orgIdHeader);
    const shiftId = req.header(API.shiftIdHeader);

    if (!orgId) {
      throw new BadRequest(`No org scope supplied`);
    }

    if (!shiftId) {
      throw new BadRequest(`No shift scope supplied`);
    }

    const orgConfig = user.organizations && user.organizations[orgId];

    if (!orgConfig) {
      throw new Forbidden(`You do not have access to the supplied org scope`);
    }

    const shift = await this.db.resolveShift(shiftId);
    const org = await this.db.resolveOrganization(orgId);

    const userRoles = orgConfig.roleIds
        .map(roleId => org.roleDefinitions.find(def => def.id == roleId))
        .filter(x => !!x)

    const userPermissions = resolvePermissionsFromRoles(userRoles)

    if (userPermissions.has(PatchPermissions.ShiftAdmin)) {
        context.set(ShiftContextKey, shift);
        return; // shift admins of an org have access to all apis on all shifts
    } else if (requiredPermissions.every(perm => userPermissions.has(perm))) {
        // TODO: This may not be necessary in the context of shifts.
        // We likely only want to check if a user is on a shift when they are editing the chat.
        // Otherwise, some explicit permission is required to make edits.
        /*
        if (requireBeingOnShift && !userOnShiftOccurrence(user.id, shiftId, shift)) {
          throw new Forbidden('You must be on a shift to do this action')
        }
        */
        context.set(ShiftContextKey, shift);
        return;
    }

    throw new Forbidden(`You do not have the required permissions.`);
  }
}

type ShiftScopedMethod = TypedPropertyDescriptor<(orgId: string, user: UserDoc, shift: ShiftDoc, ...any) => Promise<any>>;

type ShiftScopedAuthMethodDecorator = (target: Object, propertyKey: string | symbol, descriptor: ShiftScopedMethod) => ShiftScopedMethod

export function ShiftAdminOrOnShiftWithPermissions(shiftPermissions: PatchPermissions[]): ShiftScopedAuthMethodDecorator {
  return useDecorators(
    StoreSet(ShiftAccessMiddleware, {
      requiredPermissions: shiftPermissions,
      requireBeingOnShift: true
    }),
    UseBefore(ShiftAccessMiddleware),
    Authenticate()
  );
}

export function ShiftAdminOrWithPermissions(requiredPermissions: PatchPermissions[]): ShiftScopedAuthMethodDecorator {
  return useDecorators(
    StoreSet(ShiftAccessMiddleware, {
      requiredPermissions
    }),
    UseBefore(ShiftAccessMiddleware),
    Authenticate()
  );
}

export function Shift(): ParameterDecorator {
    return Context(ShiftContextKey);
}