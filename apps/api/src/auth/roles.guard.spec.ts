import { describe, it, expect } from 'vitest';
import { RolesGuard } from './roles.guard';
import type { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';

const ctxWith = (user: unknown): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => null,
    getClass: () => null,
  }) as unknown as ExecutionContext;

const reflectorWith = (roles: string[] | undefined): Reflector =>
  ({ getAllAndOverride: () => roles }) as unknown as Reflector;

describe('RolesGuard', () => {
  it('passes when no roles are required', () => {
    const guard = new RolesGuard(reflectorWith(undefined));
    expect(guard.canActivate(ctxWith({ roles: ['buyer'] }))).toBe(true);
  });

  it('passes when user has a required role', () => {
    const guard = new RolesGuard(reflectorWith(['agent']));
    expect(guard.canActivate(ctxWith({ roles: ['agent'] }))).toBe(true);
  });

  it('admin passes any requirement', () => {
    const guard = new RolesGuard(reflectorWith(['seller']));
    expect(guard.canActivate(ctxWith({ roles: ['admin'] }))).toBe(true);
  });

  it('throws when role missing', () => {
    const guard = new RolesGuard(reflectorWith(['agent']));
    expect(() => guard.canActivate(ctxWith({ roles: ['buyer'] }))).toThrow();
  });
});
