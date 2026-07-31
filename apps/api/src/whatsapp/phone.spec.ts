import { describe, expect, it } from 'vitest';

import { toWaId } from './phone';

/** EC-19b — fixture table from the brief (landlines are the regression guard). */
const FIXTURES: Array<{ input: string | null; expected: string | null }> = [
  { input: '+39 333 123 4567', expected: '393331234567' },
  { input: '0039 333 1234567', expected: '393331234567' },
  { input: '3331234567', expected: '393331234567' },
  { input: '+39 02 1234567', expected: '39021234567' }, // trunk zero retained
  { input: '02 1234567', expected: '39021234567' },
  { input: '+39-333-1234567', expected: '393331234567' },
  { input: '(+39) 333.1234567', expected: '393331234567' },
  { input: '+44 20 7946 0958', expected: '442079460958' },
  { input: 'abc', expected: null },
  { input: '', expected: null },
  { input: null, expected: null },
];

describe('toWaId (EC-19b)', () => {
  it.each(FIXTURES)('maps $input → $expected', ({ input, expected }) => {
    expect(toWaId(input)).toBe(expected);
  });

  it('preserves Italian landline trunk zero (Milan)', () => {
    expect(toWaId('+39 02 1234567')).toBe('39021234567');
    expect(toWaId('02 1234567')).toBe('39021234567');
  });
});
