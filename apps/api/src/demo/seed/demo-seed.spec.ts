import { describe, expect, it } from 'vitest';

import { createPrng } from '../prng';
import { buildDemoListings, DEMO_PRNG_SEED } from './generate-listings';
import {
  DEMO_DSAR_EMAIL,
  DEMO_SEEKER_BADGED,
  DEMO_SEEKER_EXPIRED,
  DEMO_SEEKER_PLAIN,
} from './seed-scenarios';

describe('demo PRNG + inventory (EC-15)', () => {
  it('is deterministic for the same seed', () => {
    const ra = createPrng(DEMO_PRNG_SEED);
    const rb = createPrng(DEMO_PRNG_SEED);
    const seqA = [ra(), ra(), ra(), ra(), ra()];
    const seqB = [rb(), rb(), rb(), rb(), rb()];
    expect(seqA).toEqual(seqB);
  });

  it('buildDemoListings is identical across calls and keeps €/m² inside OMI band', () => {
    const x = buildDemoListings(120);
    const y = buildDemoListings(120);
    expect(JSON.stringify(x)).toBe(JSON.stringify(y));
    expect(x).toHaveLength(120);
    expect(x.find((l) => l.ref === 'DEMO-SC1-VERIFIED')).toBeTruthy();
    expect(x.find((l) => l.ref === 'DEMO-SC2-BLOCKED')?.status).toBe('draft');
    expect(x.find((l) => l.ref === 'DEMO-SC8-CREMONA')?.province).toBe('CR');
    expect(x.find((l) => l.ref === 'DEMO-SC9-APE-ORDER')?.apeAvailable).toBe(true);
    for (const l of x) {
      expect(l.eurPerSqm).toBeGreaterThanOrEqual(l.omiMinEurSqm);
      expect(l.eurPerSqm).toBeLessThanOrEqual(l.omiMaxEurSqm);
      expect(l.imageDemoFlag).toBe(true);
    }
  });

  it('scenario seeker emails are stable for the demo script', () => {
    expect(DEMO_SEEKER_BADGED).toContain('badged');
    expect(DEMO_SEEKER_PLAIN).toContain('plain');
    expect(DEMO_SEEKER_EXPIRED).toContain('expired');
    expect(DEMO_DSAR_EMAIL).toContain('dsar');
  });
});
