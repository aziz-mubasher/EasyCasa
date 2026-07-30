import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import type { AuthUser } from './auth.types';
import type { UserRole } from '@easycasa/shared';

/** Bare `admin` or any EC-14 `admin_*` persona (and derived capability / AdminRole). */
function holdsAdminPrivilege(user: AuthUser): boolean {
  if (user.roles.includes('admin')) return true;
  if (user.roles.some((r) => String(r).toLowerCase().startsWith('admin_'))) return true;
  if (user.capabilities?.includes('admin')) return true;
  if ((user.adminRoles?.length ?? 0) > 0) return true;
  return false;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const user = ctx.switchToHttp().getRequest().user as AuthUser | undefined;
    if (!user) throw new ForbiddenException('not authenticated');
    const ok =
      user.roles.some((r) => required.includes(r)) || holdsAdminPrivilege(user);
    if (!ok) throw new ForbiddenException('insufficient role');
    return true;
  }
}
