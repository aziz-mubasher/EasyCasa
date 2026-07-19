/**
 * AVM (automated valuation) — pure types. €/m² and totals in integer euro cents.
 */

export type PropertyType = 'apartment' | 'house' | 'villa' | 'room' | 'land' | 'commercial';
export type EnergyClass = 'A4' | 'A3' | 'A2' | 'A1' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
export type Condition = 'new' | 'renovated' | 'good' | 'to_renovate';
export type Confidence = 'low' | 'medium' | 'high';

export interface SubjectProperty {
  comune: string;
  provincia: string;
  lat: number;
  lng: number;
  type: PropertyType;
  areaM2: number;
  rooms: number;
  floor: number | null;
  energyClass: EnergyClass | null;
  condition: Condition | null;
  yearBuilt: number | null;
}

export interface Comparable {
  id: string;
  lat: number;
  lng: number;
  type: PropertyType;
  areaM2: number;
  pricePerM2Cents: number;
  energyClass: EnergyClass | null;
  floor: number | null;
  condition: Condition | null;
  /** Recency of the price signal, in months. */
  soldMonthsAgo: number;
}

/** Official Agenzia delle Entrate OMI band (€/m²) for the zone + type. */
export interface OmiBand {
  minPerM2Cents: number;
  maxPerM2Cents: number;
}

export type ValuationBasis = 'comparables' | 'omi' | 'blended';

export interface ValuationEstimate {
  pointCents: number;
  minCents: number;
  maxCents: number;
  pricePerM2Cents: number;
  confidence: Confidence;
  basis: ValuationBasis;
  comparablesUsed: number;
}
