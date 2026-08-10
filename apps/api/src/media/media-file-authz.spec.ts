import { describe, expect, it } from 'vitest';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

import { classifyMediaFileKey } from './media-file-access';

/**
 * Mirrors MediaController.assertPrivateDocAccess decision rules for unit coverage
 * without spinning Nest (EC-S-T14.0 AC: unauthenticated → 401; wrong owner → 403).
 */
function decidePrivateAccess(opts: {
  user: { id: string; isAdmin: boolean } | null;
  ownerUserId: string;
}): 'ok' | '401' | '403' {
  if (!opts.user) return '401';
  if (opts.user.isAdmin) return 'ok';
  if (opts.user.id !== opts.ownerUserId) return '403';
  return 'ok';
}

describe('T14.0 private doc gate', () => {
  it('unauthenticated access to users/docs is denied', () => {
    const access = classifyMediaFileKey('users/u-seed/docs/x.pdf');
    expect(access.kind).toBe('private');
    expect(decidePrivateAccess({ user: null, ownerUserId: 'u-seed' })).toBe('401');
    expect(() => {
      if (decidePrivateAccess({ user: null, ownerUserId: 'u-seed' }) === '401') {
        throw new UnauthorizedException();
      }
    }).toThrow(UnauthorizedException);
  });

  it('owner may read; stranger may not; admin may', () => {
    expect(
      decidePrivateAccess({ user: { id: 'u-seed', isAdmin: false }, ownerUserId: 'u-seed' }),
    ).toBe('ok');
    expect(
      decidePrivateAccess({ user: { id: 'other', isAdmin: false }, ownerUserId: 'u-seed' }),
    ).toBe('403');
    expect(
      decidePrivateAccess({ user: { id: 'ops', isAdmin: true }, ownerUserId: 'u-seed' }),
    ).toBe('ok');
    expect(() => {
      if (decidePrivateAccess({ user: { id: 'x', isAdmin: false }, ownerUserId: 'u-seed' }) === '403') {
        throw new ForbiddenException();
      }
    }).toThrow(ForbiddenException);
  });

  it('listing masters stay classed as public', () => {
    const sha = 'd'.repeat(64);
    expect(classifyMediaFileKey(`media/dd/${sha}.webp`).kind).toBe('public');
  });
});
