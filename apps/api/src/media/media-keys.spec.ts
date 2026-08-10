import { describe, expect, it } from 'vitest';

import { buildGlobalContentAddressedMediaKey } from './media-keys';

describe('buildGlobalContentAddressedMediaKey', () => {
  it('uses first two hex chars as bucket', () => {
    const sha = 'a'.repeat(64);
    expect(buildGlobalContentAddressedMediaKey(sha)).toBe(`media/aa/${sha}.webp`);
  });

  it('rejects bad hashes', () => {
    expect(() => buildGlobalContentAddressedMediaKey('nope')).toThrow();
  });
});
