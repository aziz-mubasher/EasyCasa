import { describe, expect, it } from 'vitest';

import { cardPayableGrossCents } from './card-payable';

describe('cardPayableGrossCents', () => {
  it('excludes provvigione and passthrough from card total', () => {
    const total = cardPayableGrossCents([
      { kind: 'fixed', grossCents: 12200, netCents: 10000, ivaCents: 2200 },
      { kind: 'passthrough', grossCents: 3500, netCents: 3500, ivaCents: 0 },
      { kind: 'provvigione', grossCents: 5000, netCents: 4098, ivaCents: 902 },
    ]);
    expect(total).toBe(12200);
  });
});
