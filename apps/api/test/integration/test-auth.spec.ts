import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';

import { IS_PUBLIC } from '../../src/auth/public.decorator';
import { asUser, TestAuthGuard } from './test-auth';

function make(
  headers: Record<string, string | undefined>,
  isPublic = false,
): { guard: TestAuthGuard; ctx: ExecutionContext; req: { headers: typeof headers; user?: unknown } } {
  const req: { headers: typeof headers; user?: unknown } = { headers };
  const reflector = {
    getAllAndOverride: (key: unknown) => (key === IS_PUBLIC ? isPublic : undefined),
  } as unknown as Reflector;
  const guard = new TestAuthGuard(reflector);
  const ctx = {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
  return { guard, ctx, req };
}

describe('TestAuthGuard', () => {
  it('denies when no principal header is present on a guarded route', () => {
    const { guard, ctx } = make({});
    expect(() => guard.canActivate(ctx)).toThrow(/missing test principal/);
  });

  it('admits public routes without a principal', () => {
    const { guard, ctx, req } = make({}, true);
    expect(guard.canActivate(ctx)).toBe(true);
    expect(req.user).toBeUndefined();
  });

  it('admits and attaches the principal (roles default to [])', () => {
    const { guard, ctx, req } = make(asUser({ sub: 'u1', email: 'u1@example.it' }));
    expect(guard.canActivate(ctx)).toBe(true);
    expect(req.user).toEqual({
      sub: 'u1',
      email: 'u1@example.it',
      name: undefined,
      roles: [],
    });
  });

  it('preserves explicit roles', () => {
    const { guard, ctx, req } = make(asUser({ sub: 'a1', roles: ['admin'] }));
    guard.canActivate(ctx);
    expect((req.user as { roles: string[] }).roles).toEqual(['admin']);
  });
});
