import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { assertSafeMediaKey } from './media.service';

describe('assertSafeMediaKey', () => {
  it('allows listing and user keys', () => {
    expect(() => assertSafeMediaKey('listings/abc/1.jpg')).not.toThrow();
    expect(() => assertSafeMediaKey('users/u1/docs/x.pdf')).not.toThrow();
  });

  it('rejects traversal and unknown prefixes', () => {
    expect(() => assertSafeMediaKey('../etc/passwd')).toThrow(NotFoundException);
    expect(() => assertSafeMediaKey('listings/../secret')).toThrow(NotFoundException);
    expect(() => assertSafeMediaKey('/listings/x')).toThrow(NotFoundException);
    expect(() => assertSafeMediaKey('other/x')).toThrow(NotFoundException);
    expect(() => assertSafeMediaKey('')).toThrow(NotFoundException);
  });
});
