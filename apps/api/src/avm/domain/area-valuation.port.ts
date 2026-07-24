import type { PropertyType } from './types';

/** Zone €/m² band from an area data source (stub today, OMI later). Amounts in euro cents. */
export interface AreaValuationBandData {
  minPerM2Cents: number;
  avgPerM2Cents: number;
  maxPerM2Cents: number;
  source: string;
  period: string | null;
  zoneLabel: string;
  provisional: boolean;
  comparableCount: number;
}

export interface AreaValuationQuery {
  comune: string;
  provincia: string;
  propertyType: PropertyType;
  lat?: number | null;
  lng?: number | null;
  /** Exclude this listing from comparable-derived stats (detail page / edit). */
  excludeListingId?: string | null;
}

/** Swappable seam: StubAreaValuationProvider now, OmiAreaValuationProvider when licensed. */
export interface AreaValuationProvider {
  bandForArea(query: AreaValuationQuery): Promise<AreaValuationBandData | null>;
}

export const AREA_VALUATION_PROVIDER = Symbol('AREA_VALUATION_PROVIDER');

/** Minimum published comparables before showing a provisional band. */
export const MIN_AREA_COMPARABLES = 3;
