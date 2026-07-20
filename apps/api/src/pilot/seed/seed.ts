export interface PilotListing {
  wpKey: string;
  title: string;
  slug: string;
  priceEur: number;
  sqm: number;
  rooms: number;
  energyClass: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  kind: 'sale' | 'rent';
}

/**
 * A sink the loader upserts into. In the repo this is backed by Drizzle
 * (`ON CONFLICT (wp_post_id) DO UPDATE`); in tests it's an in-memory map.
 */
export interface ListingSink {
  upsertByWpKey(listing: PilotListing): Promise<void>;
  countByWpKeyPrefix(prefix: string): Promise<number>;
}

/** Curated Milan pilot set (also mirrored in pilot-listings.json for operators). */
export const PILOT_LISTINGS: PilotListing[] = [
  {
    wpKey: 'pilot-milano-navigli-bilocale',
    title: 'Bilocale luminoso in zona Navigli',
    slug: 'bilocale-navigli-milano',
    priceEur: 295000,
    sqm: 58,
    rooms: 2,
    energyClass: 'C',
    city: 'Milano',
    address: 'Via Ascanio Sforza 40, Milano',
    lat: 45.4515,
    lng: 9.177,
    kind: 'sale',
  },
  {
    wpKey: 'pilot-milano-isola-trilocale',
    title: 'Trilocale ristrutturato quartiere Isola',
    slug: 'trilocale-isola-milano',
    priceEur: 420000,
    sqm: 85,
    rooms: 3,
    energyClass: 'B',
    city: 'Milano',
    address: 'Via Borsieri 12, Milano',
    lat: 45.4869,
    lng: 9.19,
    kind: 'sale',
  },
  {
    wpKey: 'pilot-milano-citta-studi-monolocale',
    title: 'Monolocale arredato Città Studi',
    slug: 'monolocale-citta-studi-milano',
    priceEur: 168000,
    sqm: 38,
    rooms: 1,
    energyClass: 'D',
    city: 'Milano',
    address: 'Via Celoria 5, Milano',
    lat: 45.476,
    lng: 9.227,
    kind: 'sale',
  },
  {
    wpKey: 'pilot-milano-porta-romana-attico',
    title: 'Attico con terrazzo Porta Romana',
    slug: 'attico-porta-romana-milano',
    priceEur: 890000,
    sqm: 120,
    rooms: 4,
    energyClass: 'A',
    city: 'Milano',
    address: 'Viale Sabotino 8, Milano',
    lat: 45.4508,
    lng: 9.201,
    kind: 'sale',
  },
];

/**
 * Seed the pilot listings idempotently. Safe to run repeatedly (upsert on
 * wpKey). Returns how many were processed.
 */
export async function seedPilotListings(sink: ListingSink): Promise<number> {
  for (const l of PILOT_LISTINGS) {
    if (l.priceEur <= 0 || l.sqm <= 0) throw new Error(`invalid seed row: ${l.wpKey}`);
    await sink.upsertByWpKey(l);
  }
  return PILOT_LISTINGS.length;
}

/** Stable synthetic wp_post_id for string pilot keys (negative → no WP collision). */
export function wpKeyToPostId(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  }
  const id = -Math.abs(h);
  return id === 0 ? -1 : id;
}
