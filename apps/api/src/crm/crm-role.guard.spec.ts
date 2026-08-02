import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { CrmRole } from '@easycasa/shared';

import { CrmRoleGuard } from './crm-role.guard';
import { CRM_ROLES_KEY } from './crm-role.decorator';

const ALL: CrmRole[] = [
  'crm-admin',
  'crm-ops',
  'crm-conductor',
  'crm-marketing',
  'crm-readonly',
];

function reflectorWith(roles: CrmRole[] | undefined) {
  return {
    getAllAndOverride: vi.fn(() => roles),
  } as unknown as ConstructorParameters<typeof CrmRoleGuard>[0];
}

function ctxWith(user: { roles?: string[]; crmRoles?: CrmRole[] } | undefined) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as Parameters<CrmRoleGuard['canActivate']>[0];
}

describe('CrmRoleGuard — five-role coverage', () => {
  it('no-ops when @RequiresCrmRole is absent', () => {
    const guard = new CrmRoleGuard(reflectorWith(undefined), { CRM_ENABLED: false } as never);
    expect(guard.canActivate(ctxWith(undefined))).toBe(true);
  });

  it('503 when CRM_ENABLED=false', () => {
    const guard = new CrmRoleGuard(reflectorWith(ALL), { CRM_ENABLED: false } as never);
    expect(() => guard.canActivate(ctxWith({ crmRoles: ['crm-admin'] }))).toThrow(
      ServiceUnavailableException,
    );
  });

  for (const role of ALL) {
    it(`allows ${role} when listed`, () => {
      const guard = new CrmRoleGuard(reflectorWith([role]), { CRM_ENABLED: true } as never);
      expect(guard.canActivate(ctxWith({ crmRoles: [role] }))).toBe(true);
    });
  }

  it('denies crm-readonly on write roles', () => {
    const guard = new CrmRoleGuard(reflectorWith(['crm-admin', 'crm-ops', 'crm-conductor']), {
      CRM_ENABLED: true,
    } as never);
    expect(() => guard.canActivate(ctxWith({ crmRoles: ['crm-readonly'] }))).toThrow(
      ForbiddenException,
    );
  });

  it('denies crm-marketing on admin-only', () => {
    const guard = new CrmRoleGuard(reflectorWith(['crm-admin']), { CRM_ENABLED: true } as never);
    expect(() => guard.canActivate(ctxWith({ crmRoles: ['crm-marketing'] }))).toThrow(
      ForbiddenException,
    );
  });

  it('denies crm-ops on admin-only export/erasure', () => {
    const guard = new CrmRoleGuard(reflectorWith(['crm-admin']), { CRM_ENABLED: true } as never);
    expect(() => guard.canActivate(ctxWith({ crmRoles: ['crm-ops'] }))).toThrow(ForbiddenException);
  });

  it('derives crmRoles from raw realm role strings', () => {
    const guard = new CrmRoleGuard(reflectorWith(['crm-ops']), { CRM_ENABLED: true } as never);
    expect(guard.canActivate(ctxWith({ roles: ['crm-ops'] }))).toBe(true);
  });

  it('metadata key is stable', () => {
    expect(CRM_ROLES_KEY).toBe('crm_roles');
  });
});
