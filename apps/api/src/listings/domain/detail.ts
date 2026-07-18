import { scoreListingQuality } from './quality';
import type { CatastalRef, ListingDetail, RawListing } from './types';

/** €/m² in cents, or null when the area is unknown/zero. */
export function pricePerM2Cents(priceCents: number, areaM2: number): number | null {
  if (areaM2 <= 0) return null;
  return Math.round(priceCents / areaM2);
}

/** Format the catastal identifiers, or null when foglio/particella are absent. */
export function toCatastalRef(
  l: Pick<RawListing, 'foglio' | 'particella' | 'subalterno'>,
): CatastalRef | null {
  if (!l.foglio || !l.particella) return null;
  const parts = [`Foglio ${l.foglio}`, `Part. ${l.particella}`];
  if (l.subalterno) parts.push(`Sub. ${l.subalterno}`);
  return {
    foglio: l.foglio,
    particella: l.particella,
    subalterno: l.subalterno,
    display: parts.join(', '),
  };
}

/** Assemble the full listing-detail view from the raw store row. */
export function buildListingDetail(l: RawListing): ListingDetail {
  return {
    id: l.id,
    title: l.title,
    description: l.description,
    dealType: l.dealType,
    type: l.type,
    status: l.status,
    priceCents: l.priceCents,
    pricePerM2Cents: pricePerM2Cents(l.priceCents, l.areaM2),
    keyFacts: {
      areaM2: l.areaM2,
      rooms: l.rooms,
      bathrooms: l.bathrooms,
      floor: l.floor,
      totalFloors: l.totalFloors,
      yearBuilt: l.yearBuilt,
      heating: l.heating,
      condominioFeesCents: l.condominioFeesCents,
    },
    energy: {
      present: l.energyClass !== null,
      energyClass: l.energyClass,
      performanceKwhM2Y: l.energyPerformanceKwhM2Y,
    },
    catastal: toCatastalRef(l),
    features: l.features,
    location: {
      lat: l.lat,
      lng: l.lng,
      address: l.address,
      comune: l.comune,
      provincia: l.provincia,
    },
    photos: [...l.photos].sort((a, b) => a.sortOrder - b.sortOrder),
    hasFloorPlan: l.hasFloorPlan,
    quality: scoreListingQuality(l),
    agent: l.agentId ? { id: l.agentId, displayName: l.agentName ?? '' } : null,
  };
}
