import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { crmRolesFromRoles, type CrmRole } from '@easycasa/shared';

import type { AuthUser } from '../auth/auth.types';
import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import { CRM_ROLES_KEY } from './crm-role.decorator';

/**
 * K EC 4.1 — CRM role gate + feature flag.
 * No-ops when `@RequiresCrmRole` is absent (non-CRM routes).
 */
@Injectable()
export class CrmRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectConfig() private readonly config: ApiConfig,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<CrmRole[] | undefined>(CRM_ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    if (!this.config.CRM_ENABLED) {
      throw new ServiceUnavailableException('CRM is disabled (CRM_ENABLED=false)');
    }

    const user = ctx.switchToHttp().getRequest().user as AuthUser | undefined;
    if (!user) throw new ForbiddenException('not authenticated');

    const held = new Set(
      user.crmRoles ?? crmRolesFromRoles(user.roles.map(String)),
    );
    if (!required.some((r) => held.has(r))) {
      throw new ForbiddenException('insufficient crm role');
    }
    return true;
  }
}
