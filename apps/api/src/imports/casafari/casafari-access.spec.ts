import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  assertCasafariImporter,
  casafariImporterIdentity,
  isCasafariImporter,
} from './casafari-access';
import type { AuthUser } from '../../auth/auth.types';

function user(partial: Partial<AuthUser>): AuthUser {
  return {
    sub: 'sub',
    roles: ['seller'],
    ...partial,
  };
}

describe('casafari-access', () => {
  it('allows admin role or allowlisted importer usernames', () => {
    expect(isCasafariImporter(user({ preferredUsername: 'anyone', roles: ['admin'] }))).toBe(true);
    expect(isCasafariImporter(user({ preferredUsername: 'muba-seller' }))).toBe(true);
    expect(isCasafariImporter(user({ preferredUsername: 'muba-admin', roles: ['admin'] }))).toBe(
      true,
    );
    expect(
      isCasafariImporter(user({ preferredUsername: undefined, email: 'muba-seller@easycasaita.com' })),
    ).toBe(true);
    expect(isCasafariImporter(user({ preferredUsername: 'other-seller', roles: ['seller'] }))).toBe(
      false,
    );
  });

  it('casafariImporterIdentity prefers preferredUsername over email', () => {
    expect(
      casafariImporterIdentity(
        user({ preferredUsername: 'muba-seller', email: 'other@example.com' }),
      ),
    ).toBe('muba-seller');
  });

  it('assertCasafariImporter throws for everyone else', () => {
    expect(() =>
      assertCasafariImporter(user({ preferredUsername: 'muba-seller' })),
    ).not.toThrow();
    expect(() =>
      assertCasafariImporter(user({ preferredUsername: 'ops', roles: ['admin'] })),
    ).not.toThrow();
    expect(() =>
      assertCasafariImporter(user({ preferredUsername: 'alice', roles: ['seller'] })),
    ).toThrow(ForbiddenException);
  });
});
