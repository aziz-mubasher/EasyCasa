import { describe, expect, it } from 'vitest';

import { resolveBunnyHttpBase } from './bunny-http-storage';

describe('resolveBunnyHttpBase', () => {
  it('maps DE S3 regional host to global HTTP host (de.storage does not resolve)', () => {
    expect(resolveBunnyHttpBase('https://de-s3.storage.bunnycdn.com', 'de')).toBe(
      'https://storage.bunnycdn.com',
    );
  });

  it('maps UK S3 regional host to HTTP regional host', () => {
    expect(resolveBunnyHttpBase('https://uk-s3.storage.bunnycdn.com', 'uk')).toBe(
      'https://uk.storage.bunnycdn.com',
    );
  });

  it('uses global HTTP host for global S3 + de region', () => {
    expect(resolveBunnyHttpBase('https://storage.bunnycdn.com', 'de')).toBe(
      'https://storage.bunnycdn.com',
    );
  });
});
