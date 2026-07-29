import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  assertCasafariImporter,
  isCasafariImporter,
} from './casafari-access';
import type { AuthUser } from '../../auth/auth.types';

function user(partial: Partial<AuthUser>): AuthUser {
  return {
    sub: 'sub',
    roles: ['admin'],
    ...partial,
  };
}

describe('casafari-access', () => {
  it('allows only preferredUsername muba-admin', () => {
    expect(isCasafariImporter(user({ preferredUsername: 'muba-admin' }))).toBe(true);
    expect(isCasafariImporter(user({ preferredUsername: 'Muba-Admin' }))).toBe(true);
    expect(isCasafariImporter(user({ preferredUsername: 'other-admin', roles: ['admin'] }))).toBe(
      false,
    );
    expect(isCasafariImporter(user({ preferredUsername: 'seller1', roles: ['seller'] }))).toBe(
      false,
    );
  });

  it('assertCasafariImporter throws for everyone else', () => {
    expect(() => assertCasafariImporter(user({ preferredUsername: 'muba-admin' }))).not.toThrow();
    expect(() => assertCasafariImporter(user({ preferredUsername: 'alice', roles: ['admin'] }))).toThrow(
      ForbiddenException,
    );
  });
});
