import { describe, expect, it } from 'vitest';

import { positionAskingOnBand } from './omi-band.service';

describe('positionAskingOnBand (EC-S-T09)', () => {
  const band = { minEurSqm: 1800, maxEurSqm: 2600, medianEurSqm: 2200 };

  it('marks in-band within ±20%', () => {
    // 2000 €/m² on 100m² = 200k → ~-9% vs 2200
    const pos = positionAskingOnBand(200_000, 100, band);
    expect(pos?.kind).toBe('in_band');
  });

  it('marks above when >+20%', () => {
    const pos = positionAskingOnBand(300_000, 100, band); // 3000 vs 2200 ≈ +36%
    expect(pos?.kind).toBe('above');
    expect(pos!.deviationPct).toBeGreaterThan(20);
  });

  it('marks below when <-20%', () => {
    const pos = positionAskingOnBand(150_000, 100, band); // 1500 vs 2200 ≈ -32%
    expect(pos?.kind).toBe('below');
  });

  it('returns null when band missing / bad inputs', () => {
    expect(positionAskingOnBand(0, 100, band)).toBeNull();
    expect(positionAskingOnBand(200_000, 0, band)).toBeNull();
  });
});
