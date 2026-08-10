import { describe, expect, it } from 'vitest';

import { positionOnBand } from '../../components/listings/OmiPricePanel';

describe('OmiPricePanel positionOnBand', () => {
  const band = {
    minEurSqm: 1800,
    maxEurSqm: 2600,
    medianEurSqm: 2200,
    semester: '2024-2',
    zoneId: 'B001',
  };

  it('hides math when band would be missing (caller returns null panel)', () => {
    expect(positionOnBand(0, 100, band)).toBeNull();
  });

  it('flags >20% above midpoint', () => {
    expect(positionOnBand(300_000, 100, band)?.kind).toBe('above');
  });
});
