import type { EnergyClass, ListingPin, PropertyType } from '../search/domain/types';

const PROPERTY_TYPES = new Set<string>([
  'apartment',
  'house',
  'villa',
  'room',
  'land',
  'commercial',
]);
const ENERGY = new Set<string>(['A4', 'A3', 'A2', 'A1', 'B', 'C', 'D', 'E', 'F', 'G']);

/** Map a listings table row (or publish result) to a Phase 20 ListingPin. */
export function listingRowToPin(r: {
  id: string;
  title: string;
  latitude: number | null;
  longitude: number | null;
  price: string | null;
  transactionType: 'sale' | 'rent' | null;
  bedrooms: number | null;
  rooms: number | null;
  sizeSqm: string | null;
  energyClass: string | null;
  propertyType: string | null;
  thumbnailUrl?: string | null;
}): ListingPin | null {
  if (r.latitude == null || r.longitude == null) return null;
  const deal = r.transactionType;
  if (deal !== 'sale' && deal !== 'rent') return null;
  const rawType = r.propertyType ?? 'apartment';
  const type = PROPERTY_TYPES.has(rawType) ? (rawType as PropertyType) : 'apartment';
  const energy =
    r.energyClass && ENERGY.has(r.energyClass) ? (r.energyClass as EnergyClass) : null;
  return {
    listingId: r.id,
    lat: r.latitude,
    lng: r.longitude,
    priceCents: Math.round(Number(r.price ?? 0) * 100),
    dealType: deal,
    type,
    rooms: r.rooms ?? r.bedrooms ?? 0,
    areaM2: Number(r.sizeSqm ?? 0),
    energyClass: energy,
    title: r.title,
    thumbnailUrl: r.thumbnailUrl ?? null,
  };
}
