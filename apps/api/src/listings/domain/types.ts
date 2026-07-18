/**
 * Listing-detail domain — pure types. Prices in integer euro cents.
 */

export type DealType = 'sale' | 'rent';
export type PropertyType = 'apartment' | 'house' | 'villa' | 'room' | 'land' | 'commercial';
export type EnergyClass = 'A4' | 'A3' | 'A2' | 'A1' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export interface Photo {
  url: string;
  sortOrder: number;
}

/** Raw listing as read from the store (close to the DB shape). */
export interface RawListing {
  id: string;
  title: string;
  description: string | null;
  dealType: DealType;
  type: PropertyType;
  status: string;
  priceCents: number;
  areaM2: number;
  rooms: number;
  bathrooms: number | null;
  floor: number | null;
  totalFloors: number | null;
  yearBuilt: number | null;
  energyClass: EnergyClass | null;
  energyPerformanceKwhM2Y: number | null;
  foglio: string | null;
  particella: string | null;
  subalterno: string | null;
  features: string[];
  condominioFeesCents: number | null;
  heating: string | null;
  lat: number;
  lng: number;
  address: string;
  comune: string;
  provincia: string;
  photos: Photo[];
  hasFloorPlan: boolean;
  agentId: string | null;
  agentName: string | null;
}

export interface CatastalRef {
  foglio: string;
  particella: string;
  subalterno: string | null;
  display: string;
}

export interface ApeSummary {
  present: boolean;
  energyClass: EnergyClass | null;
  performanceKwhM2Y: number | null;
}

export interface KeyFacts {
  areaM2: number;
  rooms: number;
  bathrooms: number | null;
  floor: number | null;
  totalFloors: number | null;
  yearBuilt: number | null;
  heating: string | null;
  condominioFeesCents: number | null;
}

export interface QualityScore {
  score: number; // 0–100
  missing: string[];
}

export interface ListingDetail {
  id: string;
  title: string;
  description: string | null;
  dealType: DealType;
  type: PropertyType;
  status: string;
  priceCents: number;
  pricePerM2Cents: number | null;
  keyFacts: KeyFacts;
  energy: ApeSummary;
  catastal: CatastalRef | null;
  features: string[];
  location: { lat: number; lng: number; address: string; comune: string; provincia: string };
  photos: Photo[];
  hasFloorPlan: boolean;
  quality: QualityScore;
  agent: { id: string; displayName: string } | null;
}

export interface SimilarPin {
  listingId: string;
  title: string;
  priceCents: number;
  areaM2: number;
  lat: number;
  lng: number;
  thumbnailUrl: string | null;
}
