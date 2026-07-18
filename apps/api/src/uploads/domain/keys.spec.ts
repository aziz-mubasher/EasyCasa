import { describe, expect, it } from 'vitest';

import { buildObjectKey, isAllowedContentType, safeBasename } from './keys';

describe('upload keys', () => {
  it('content-type allowlist', () => {
    expect(isAllowedContentType('application/pdf')).toBe(true);
    expect(isAllowedContentType('image/png')).toBe(true);
    expect(isAllowedContentType('application/x-sh')).toBe(false);
    expect(isAllowedContentType('text/html')).toBe(false);
  });

  it('safeBasename strips paths and unsafe chars', () => {
    expect(safeBasename('../../etc/passwd')).toBe('passwd');
    expect(safeBasename('my file (1).pdf')).toBe('my_file__1_.pdf');
    expect(safeBasename('C:\\Users\\x\\ape.pdf')).toBe('ape.pdf');
  });

  it('safeBasename removes leading dots (no hidden/traversal)', () => {
    expect(safeBasename('...hidden')).toBe('hidden');
  });

  it('buildObjectKey scopes under the user prefix', () => {
    const key = buildObjectKey('user_abc', 'APE.pdf', 'id123');
    expect(key).toBe('users/user_abc/docs/id123-APE.pdf');
  });

  it('buildObjectKey cannot be escaped via filename traversal', () => {
    const key = buildObjectKey('user_abc', '../../../root.key', 'id123');
    expect(key).toBe('users/user_abc/docs/id123-root.key');
    expect(key.startsWith('users/user_abc/docs/')).toBe(true);
    expect(key.includes('..')).toBe(false);
  });
});
