import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  adminRolesFromRoles,
  capabilitiesFromRoles,
  type UserRole,
} from '@easycasa/shared';

import { IS_PUBLIC } from '../../src/auth/public.decorator';
import type { AuthUser } from '../../src/auth/auth.types';

/**
 * Test-only auth — Phase 34.
 *
 * The harness overrides `JwtAuthGuard` with this stub. Reads a JSON principal
 * from `x-test-user` (same `AuthUser` shape as production). Respects `@Public()`
 * so discovery/health routes stay anonymous. No header on a guarded route → 401.
 */
export type TestPrincipal = Pick<AuthUser, 'sub'> & Partial<Omit<AuthUser, 'sub' | 'roles'>> & {
  /** Realm role strings (may include admin_* not in UserRole union). */
  roles?: Array<UserRole | string>;
};

@Injectable()
export class TestAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: AuthUser;
    }>();

    const raw = header(req.headers, 'x-test-user');
    if (raw) {
      const principal = JSON.parse(raw) as TestPrincipal;
      const roles = (principal.roles ?? []) as UserRole[];
      const roleStrings = roles.map(String);
      req.user = {
        sub: principal.sub,
        email: principal.email,
        name: principal.name,
        roles,
        capabilities: principal.capabilities ?? capabilitiesFromRoles(roleStrings),
        adminRoles: principal.adminRoles ?? adminRolesFromRoles(roleStrings),
      };
      return true;
    }

    if (isPublic) return true;
    throw new UnauthorizedException('missing test principal');
  }
}

/** Build the header a test uses to authenticate as a given principal. */
export function asUser(principal: TestPrincipal): Record<string, string> {
  return { 'x-test-user': JSON.stringify(principal) };
}

function header(
  headers: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = headers[key];
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  return undefined;
}
