import { describe, expect, it } from 'vitest';
import {
  PublishEnergyFiguresError,
  assertPublishEnergyFigures,
  hasPublishEnergyFigures,
} from '@easycasa/shared';

describe('R4 publish energy figures (all publish paths)', () => {
  it('accepts class + positive index', () => {
    expect(hasPublishEnergyFigures({ energyClass: 'D', energyPerformanceKwhM2Y: 142.5 })).toBe(true);
    expect(() =>
      assertPublishEnergyFigures({ energyClass: 'A2', energyPerformanceKwhM2Y: '80' }),
    ).not.toThrow();
  });

  it('rejects missing class, missing index, zero, or blank — null is not an exemption', () => {
    expect(hasPublishEnergyFigures({ energyClass: 'G', energyPerformanceKwhM2Y: null })).toBe(false);
    expect(hasPublishEnergyFigures({ energyClass: '', energyPerformanceKwhM2Y: 120 })).toBe(false);
    expect(hasPublishEnergyFigures({ energyClass: 'C', energyPerformanceKwhM2Y: 0 })).toBe(false);
    expect(() =>
      assertPublishEnergyFigures({ energyClass: null, energyPerformanceKwhM2Y: null }),
    ).toThrow(PublishEnergyFiguresError);
  });
});
