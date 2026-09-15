import { describe, expect, it } from 'vitest';
import {
  assertEnergyAdvertComplete,
  energyAdvertComplete,
  EnergyAdvertError,
  normalizeEnergyClass,
} from '@easycasa/shared';

describe('energy advert (D.lgs. 192/2005)', () => {
  it('requires both class and index', () => {
    expect(energyAdvertComplete({ energyClass: 'G', energyPerformanceKwhM2Y: 180 })).toBe(true);
    expect(energyAdvertComplete({ energyClass: 'G', energyPerformanceKwhM2Y: null })).toBe(false);
    expect(energyAdvertComplete({ energyClass: null, energyPerformanceKwhM2Y: 180 })).toBe(false);
    expect(energyAdvertComplete({ energyClass: 'g', energyPerformanceKwhM2Y: '120' })).toBe(true);
  });

  it('rejects unknown class letters and never treats missing as exempt', () => {
    expect(normalizeEnergyClass('  a4 ')).toBe('A4');
    expect(energyAdvertComplete({ energyClass: 'Z', energyPerformanceKwhM2Y: 10 })).toBe(false);
    expect(() => assertEnergyAdvertComplete({ energyClass: null, energyPerformanceKwhM2Y: null })).toThrow(
      EnergyAdvertError,
    );
  });
});
