import { describe, expect, it } from 'vitest';

import { toPgInt64OrNull } from './dupdetect.client';

describe('toPgInt64OrNull', () => {
  it('keeps signed int64 values', () => {
    expect(toPgInt64OrNull(0n)).toBe(0n);
    expect(toPgInt64OrNull(9223372036854775807n)).toBe(9223372036854775807n);
    expect(toPgInt64OrNull(-9223372036854775808n)).toBe(-9223372036854775808n);
  });

  it('nulls unsigned-style overflows that break media inserts', () => {
    expect(toPgInt64OrNull(15480606700080650240n)).toBeNull();
  });
});
