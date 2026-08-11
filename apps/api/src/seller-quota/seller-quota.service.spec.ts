import { HttpException, HttpStatus } from '@nestjs/common';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DEFAULT_QUOTA } from '@easycasa/shared';

import {
  isQuotaExempt,
  pickQuotaLocale,
  resolveQuotaConfig,
  resetSoftConfigLogFlagForTests,
  throwQuotaExceeded,
} from './seller-quota.service';
import type { AuthUser } from '../auth/auth.types';
import type { ApiConfig } from '../config/load';

describe('seller quota helpers (EC-S T19.1)', () => {
  beforeEach(() => resetSoftConfigLogFlagForTests());

  it('soft-fails invalid config to defaults', () => {
    const warn = { warn: vi.fn() } as never;
    const cfg = resolveQuotaConfig(
      {
        SELLER_MAX_ACTIVE_LISTINGS: -1,
        SELLER_MAX_UPLOADS_PER_DAY: Number.NaN,
      } as unknown as ApiConfig,
      warn,
    );
    expect(cfg.maxActiveListings).toBe(DEFAULT_QUOTA.maxActiveListings);
    expect(cfg.maxUploadsPerDay).toBe(DEFAULT_QUOTA.maxUploadsPerDay);
  });

  it('accepts valid config numbers', () => {
    const cfg = resolveQuotaConfig({
      SELLER_MAX_ACTIVE_LISTINGS: 7,
      SELLER_MAX_UPLOADS_PER_DAY: 3,
    } as unknown as ApiConfig);
    expect(cfg).toEqual({
      maxActiveListings: 7,
      maxUploadsPerDay: 3,
      timeZone: 'Europe/Rome',
    });
  });

  it('admins are quota-exempt; plain sellers are not', () => {
    const seller: AuthUser = { sub: 's', roles: ['seller'] };
    const admin: AuthUser = { sub: 'a', roles: ['admin'] };
    const ops: AuthUser = { sub: 'o', roles: ['buyer'], adminRoles: ['superadmin'] };
    expect(isQuotaExempt(seller)).toBe(false);
    expect(isQuotaExempt(admin)).toBe(true);
    expect(isQuotaExempt(ops)).toBe(true);
  });

  it('pickQuotaLocale maps Accept-Language', () => {
    expect(pickQuotaLocale('en-US,en;q=0.9')).toBe('en');
    expect(pickQuotaLocale('es')).toBe('es');
    expect(pickQuotaLocale(undefined)).toBe('it');
  });

  it('throwQuotaExceeded is 429 with code + retryAfter', () => {
    try {
      throwQuotaExceeded({
        kind: 'uploadsPerDay',
        locale: 'en',
        retryAfterSeconds: 3600,
      });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      const ex = err as HttpException;
      expect(ex.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(ex.getResponse()).toEqual(
        expect.objectContaining({
          code: 'errors.quota.uploadsPerDay',
          retryAfterSeconds: 3600,
        }),
      );
    }
  });
});
