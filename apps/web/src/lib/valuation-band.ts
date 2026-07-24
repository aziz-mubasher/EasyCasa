/** Client-side mirror of API AVM property types for POST /avm/band. */
const AVM_TYPES = ['apartment', 'house', 'villa', 'room', 'land', 'commercial'] as const;
export type AvmPropertyType = (typeof AVM_TYPES)[number];

export function taxonomySlugToAvmType(slug: string): AvmPropertyType | null {
  const t = slug.trim().toLowerCase().replace(/\s+/g, '_');
  if ((AVM_TYPES as readonly string[]).includes(t)) return t as AvmPropertyType;
  if (['studio', 'penthouse', 'loft', 'attic'].includes(t)) return 'apartment';
  if (['townhouse', 'detached', 'rustic', 'farmhouse'].includes(t)) return 'house';
  if (t === 'building') return 'commercial';
  if (t === 'room') return 'room';
  return null;
}

export interface ValuationBandAnchorsDto {
  selling: { totalCents: number; perM2Cents: number };
  fairMarket: { totalCents: number; perM2Cents: number };
  outOfMarket: { totalCents: number; perM2Cents: number };
}

export interface ValuationBandMarkerDto {
  totalCents: number;
  perM2Cents: number;
  positionPct: number;
  side: 'below' | 'in_band' | 'above';
  clamped: boolean;
}

export type ValuationBandResponseDto =
  | {
      status: 'ok';
      surfaceM2: number;
      anchors: ValuationBandAnchorsDto;
      asking: ValuationBandMarkerDto | null;
      provenance: {
        source: 'omi' | 'comparable_listings';
        period: string | null;
        zoneLabel: string;
        provisional: boolean;
        attribution: string | null;
        geoLevel: 'microzone' | 'comune';
      };
      comparableCount: number;
    }
  | {
      status: 'unavailable';
      reason: string;
    };

export function valuationBandEnabled(): boolean {
  return process.env.NEXT_PUBLIC_VALUATION_BAND_ENABLED === 'true';
}

const BASE =
  (typeof window === 'undefined' ? process.env.API_URL : process.env.NEXT_PUBLIC_API_URL) ??
  'http://localhost/api';

export async function fetchListingValuationBand(slug: string): Promise<ValuationBandResponseDto> {
  const res = await fetch(`${BASE}/listings/${encodeURIComponent(slug)}/valuation-band`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`valuation-band failed: ${res.status}`);
  return res.json() as Promise<ValuationBandResponseDto>;
}

export async function previewValuationBand(body: {
  comune: string;
  provincia: string;
  propertyType: AvmPropertyType;
  sizeSqm: number;
  askingPriceEur?: number;
}): Promise<ValuationBandResponseDto> {
  const res = await fetch(`${BASE}/avm/band`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`avm/band failed: ${res.status}`);
  return res.json() as Promise<ValuationBandResponseDto>;
}

export function centsToEuro(cents: number): number {
  return cents / 100;
}
