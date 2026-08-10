import { describe, expect, it } from 'vitest';

import {
  classifyMediaFileKey,
  isPubliclyReadableMediaKey,
  ownerUserIdFromPrivateDocKey,
} from './media-file-access';

describe('isPubliclyReadableMediaKey', () => {
  it('allows content-addressed listing masters', () => {
    const sha = 'a'.repeat(64);
    expect(isPubliclyReadableMediaKey(`media/aa/${sha}.webp`)).toBe(true);
  });

  it('allows legacy listings/ keys', () => {
    expect(isPubliclyReadableMediaKey('listings/abc/1.webp')).toBe(true);
  });

  it('denies users/docs as public', () => {
    expect(isPubliclyReadableMediaKey('users/u1/docs/x.pdf')).toBe(false);
  });
});

describe('ownerUserIdFromPrivateDocKey', () => {
  it('extracts owner id', () => {
    expect(ownerUserIdFromPrivateDocKey('users/u1/docs/vo/c1/x.pdf')).toBe('u1');
  });

  it('returns null for public keys', () => {
    expect(ownerUserIdFromPrivateDocKey('media/aa/' + 'b'.repeat(64) + '.webp')).toBeNull();
  });
});

describe('classifyMediaFileKey', () => {
  it('classifies public / private / deny', () => {
    const sha = 'c'.repeat(64);
    expect(classifyMediaFileKey(`media/cc/${sha}.webp`)).toEqual({ kind: 'public' });
    expect(classifyMediaFileKey('users/abc/docs/x.pdf')).toEqual({
      kind: 'private',
      ownerUserId: 'abc',
    });
    expect(classifyMediaFileKey('other/x')).toEqual({ kind: 'deny' });
    expect(classifyMediaFileKey('../etc/passwd')).toEqual({ kind: 'deny' });
  });
});
