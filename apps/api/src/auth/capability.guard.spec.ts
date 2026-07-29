import { describe, expect, it } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';

import { CapabilityGuard } from './capability.guard';
import { IS_PUBLIC } from './public.decorator';
import { ROLES_KEY } from './roles.decorator';
import { CAPABILITIES_KEY, REQUIRES_AUTH_KEY } from './capability.decorator';
import { ADMIN_ROLES_KEY } from './admin-role.decorator';

function ctx(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function reflector(map: Record<string, unknown>): Reflector {
  return {
    getAllAndOverride: (key: string) => map[key],
  } as unknown as Reflector;
}

describe('CapabilityGuard (EC-11 fail-closed)', () => {
  it('allows @Public', () => {
    const g = new CapabilityGuard(reflector({ [IS_PUBLIC]: true }));
    expect(g.canActivate(ctx(undefined))).toBe(true);
  });

  it('denies undecorated routes', () => {
    const g = new CapabilityGuard(reflector({}));
    expect(() => g.canActivate(ctx({ roles: ['buyer'], capabilities: ['seeker'] }))).toThrow(
      /not capability-declared/,
    );
  });

  it('allows @RequiresAuth when authenticated', () => {
    const g = new CapabilityGuard(reflector({ [REQUIRES_AUTH_KEY]: true }));
    expect(g.canActivate(ctx({ roles: ['buyer'], capabilities: ['seeker'] }))).toBe(true);
  });

  it('checks RequiredCapability', () => {
    const g = new CapabilityGuard(
      reflector({ [CAPABILITIES_KEY]: ['conductor'] }),
    );
    expect(() =>
      g.canActivate(ctx({ roles: ['buyer'], capabilities: ['seeker'] })),
    ).toThrow(/insufficient capability/);
    expect(
      g.canActivate(ctx({ roles: ['seller'], capabilities: ['seeker', 'conductor', 'owner'] })),
    ).toBe(true);
  });

  it('treats @Roles as declared', () => {
    const g = new CapabilityGuard(reflector({ [ROLES_KEY]: ['admin'] }));
    expect(g.canActivate(ctx({ roles: ['admin'], capabilities: ['admin', 'seeker'] }))).toBe(
      true,
    );
  });

  it('enforces admin sub-role', () => {
    const g = new CapabilityGuard(
      reflector({ [ADMIN_ROLES_KEY]: ['aml'], [REQUIRES_AUTH_KEY]: true }),
    );
    expect(() =>
      g.canActivate(
        ctx({ roles: ['admin'], capabilities: ['admin'], adminRoles: ['operations'] }),
      ),
    ).toThrow(/insufficient admin role/);
    expect(
      g.canActivate(
        ctx({ roles: ['admin'], capabilities: ['admin'], adminRoles: ['aml'] }),
      ),
    ).toBe(true);
    expect(
      g.canActivate(
        ctx({ roles: ['admin'], capabilities: ['admin'], adminRoles: ['superadmin'] }),
      ),
    ).toBe(true);
  });
});
