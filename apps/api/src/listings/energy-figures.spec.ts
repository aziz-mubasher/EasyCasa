import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PublishEnergyFiguresError,
  assertPublishEnergyFigures,
  hasPublishEnergyFigures,
} from '@easycasa/shared';

const ROOT = resolve(__dirname, '../../../..');

const PUBLISH_PATHS = [
  ['API / owner / admin / web form', 'apps/api/src/listings/listings.service.ts'],
  ['seller HTTP', 'apps/api/src/listings/seller-listings.controller.ts'],
  ['listings HTTP', 'apps/api/src/listings/listings.controller.ts'],
  ['ETL WordPress load', 'migration/src/etl/load.ts'],
  ['demo seed sink', 'apps/api/src/demo/seed/demo-listing.sink.ts'],
  ['pilot seed sink', 'apps/api/src/pilot/seed/drizzle-listing.sink.ts'],
  ['add-listing form', 'apps/web/src/components/add/AddListingForm.tsx'],
] as const;

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

  it.each(PUBLISH_PATHS)('%s wires the R4 energy invariant', (_label, rel) => {
    const src = readFileSync(resolve(ROOT, rel), 'utf8');
    expect(src).toMatch(/assertPublishEnergyFigures|hasPublishEnergyFigures/);
  });
});
