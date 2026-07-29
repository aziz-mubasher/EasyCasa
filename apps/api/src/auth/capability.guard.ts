import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  adminRolesFromRoles,
  capabilitiesFromRoles,
  type AdminRole,
  type Capability,
} from '@easycasa/shared';

import type { AuthUser } from './auth.types';
import { IS_PUBLIC } from './public.decorator';
import { ROLES_KEY } from './roles.decorator';
import { CAPABILITIES_KEY, REQUIRES_AUTH_KEY } from './capability.decorator';
import { ADMIN_ROLES_KEY } from './admin-role.decorator';

/**
 * EC-11 fail-closed capability gate.
 *
 * Allow when:
 * - `@Public`
 * - `@RequiresCapability` and principal holds ≥1 listed capability
 * - `@Roles` (legacy) — RolesGuard already enforced; treated as declared
 * - `@RequiresAuth` and principal is authenticated
 *
 * Otherwise deny — undecorated routes must not open by accident.
 */
@Injectable()
export class CapabilityGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const handler = ctx.getHandler();
    const klass = ctx.getClass();

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [handler, klass]);
    if (isPublic) return true;

    const requiredCaps = this.reflector.getAllAndOverride<Capability[] | undefined>(
      CAPABILITIES_KEY,
      [handler, klass],
    );
    const requiredRoles = this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [
      handler,
      klass,
    ]);
    const requiresAuth = this.reflector.getAllAndOverride<boolean>(REQUIRES_AUTH_KEY, [
      handler,
      klass,
    ]);
    const requiredAdmin = this.reflector.getAllAndOverride<AdminRole[] | undefined>(
      ADMIN_ROLES_KEY,
      [handler, klass],
    );

    const declared =
      (requiredCaps && requiredCaps.length > 0) ||
      (requiredRoles && requiredRoles.length > 0) ||
      requiresAuth === true ||
      (requiredAdmin && requiredAdmin.length > 0);

    if (!declared) {
      throw new ForbiddenException(
        `route ${klass.name}.${String(handler.name)} is not capability-declared (EC-11 fail-closed)`,
      );
    }

    const user = ctx.switchToHttp().getRequest().user as AuthUser | undefined;
    if (!user) throw new ForbiddenException('not authenticated');

    if (requiredCaps && requiredCaps.length > 0) {
      const held = new Set(
        user.capabilities ?? capabilitiesFromRoles(user.roles.map(String)),
      );
      if (!requiredCaps.some((c) => held.has(c))) {
        throw new ForbiddenException('insufficient capability');
      }
    }

    if (requiredAdmin && requiredAdmin.length > 0) {
      const held = new Set(
        user.adminRoles ?? adminRolesFromRoles(user.roles.map(String)),
      );
      // superadmin may do anything admin-scoped
      if (!requiredAdmin.some((r) => held.has(r)) && !held.has('superadmin')) {
        throw new ForbiddenException('insufficient admin role');
      }
    }

    return true;
  }
}
