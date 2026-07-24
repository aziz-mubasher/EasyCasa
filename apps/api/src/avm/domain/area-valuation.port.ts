import type { PropertyType } from './types';

/** Zone €/m² band from an area data source (OMI or provisional comparables). Amounts in euro cents. */
export interface AreaValuationBandData {
  minPerM2Cents: number;
  avgPerM2Cents: number;
  maxPerM2Cents: number;
  /** `omi` only when values come from omi_quotes; never for stub comparables. */
  source: 'omi' | 'comparable_listings';
  period: string | null;
  zoneLabel: string;
  /** Mandatory attribution when source is `omi`. */
  attribution: string | null;
  geoLevel: 'microzone' | 'comune';
  provisional: boolean;
  comparableCount: number;
}

export interface AreaValuationQuery {
  comune: string;
  provincia: string;
  propertyType: PropertyType;
  lat?: number | null;
  lng?: number | null;
  condition?: import('./types').Condition | null;
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
