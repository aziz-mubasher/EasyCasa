import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNotNull, ne, or, sql } from 'drizzle-orm';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { listings } from '../db/schema';
import {
  type AreaValuationBandData,
  type AreaValuationProvider,
  type AreaValuationQuery,
  MIN_AREA_COMPARABLES,
} from './domain/area-valuation.port';
import { normalizePropertyType } from './domain/normalize-property-type';
import type { PropertyType } from './domain/types';

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
  }
  return sorted[mid]!;
}

function spreadFromValues(values: number[], avg: number): { min: number; max: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const pLow = sorted[Math.max(0, Math.floor(sorted.length * 0.15))] ?? sorted[0]!;
  const pHigh = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.85) - 1)] ?? sorted.at(-1)!;
  const spread = Math.max(0.06, (pHigh - pLow) / (2 * avg));
  return {
    min: Math.round(avg * (1 - spread)),
    max: Math.round(avg * (1 + spread)),
  };
}

/**
 * Provisional area band from published listings in the same comune (then provincia).
 * Not OMI — replace with OmiAreaValuationProvider when counsel clears redistribution.
 */
@Injectable()
export class StubAreaValuationProvider implements AreaValuationProvider {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async bandForArea(query: AreaValuationQuery): Promise<AreaValuationBandData | null> {
    const comune = query.comune.trim();
    const provincia = query.provincia.trim();
    if (!provincia) return null;

    if (comune) {
      const comuneBand = await this.collect(comune, provincia, query.propertyType, query.excludeListingId);
      if (comuneBand.ppm2.length >= MIN_AREA_COMPARABLES) {
        return this.toBand(comuneBand.ppm2, `${comune}, ${provincia}`, comuneBand.ppm2.length);
      }
    }

    const provBand = await this.collect(null, provincia, query.propertyType, query.excludeListingId);
    if (provBand.ppm2.length < MIN_AREA_COMPARABLES) return null;

    const label = comune ? `${comune} (${provincia})` : provincia;
    return this.toBand(provBand.ppm2, label, provBand.ppm2.length);
  }

  private toBand(ppm2: number[], zoneLabel: string, count: number): AreaValuationBandData {
    const avg = median(ppm2);
    const { min, max } = spreadFromValues(ppm2, avg);
    const now = new Date();
    const half = now.getMonth() < 6 ? 'H1' : 'H2';
    return {
      minPerM2Cents: min,
      avgPerM2Cents: avg,
      maxPerM2Cents: max,
      source: 'comparable_listings',
      period: `${now.getFullYear()}-${half}`,
      zoneLabel,
      attribution: null,
      geoLevel: 'comune',
      provisional: true,
      comparableCount: count,
    };
  }

  private async collect(
    comune: string | null,
    provincia: string,
    type: PropertyType,
    excludeListingId?: string | null,
  ): Promise<{ ppm2: number[] }> {
    const rows = await this.db
      .select({
        propertyType: listings.propertyType,
        sizeSqm: listings.sizeSqm,
        price: listings.price,
      })
      .from(listings)
      .where(
        and(
          eq(listings.province, provincia),
          eq(listings.status, 'published'),
          isNotNull(listings.price),
          isNotNull(listings.sizeSqm),
          gt(sql`(${listings.sizeSqm})::numeric`, 0),
          gt(sql`(${listings.price})::numeric`, 0),
          excludeListingId ? ne(listings.id, excludeListingId) : undefined,
          comune
            ? or(
                sql`lower(trim(${listings.city})) = lower(${comune})`,
                sql`lower(trim(${listings.city})) = lower(${comune.replace(/_/g, ' ')})`,
              )
            : undefined,
        ),
      )
      .limit(400);

    const ppm2: number[] = [];
    for (const r of rows) {
      const resolved = normalizePropertyType(r.propertyType);
      if (resolved !== type) continue;
      const areaM2 = Number(r.sizeSqm);
      const priceEur = Number(r.price);
      if (!(areaM2 > 0) || !(priceEur > 0)) continue;
      ppm2.push(Math.round((priceEur * 100) / areaM2));
    }
    return { ppm2 };
  }
}
