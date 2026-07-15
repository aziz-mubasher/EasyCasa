/**
 * WordPress listing meta-key mapping (easycasaita.com audit, Jul 2026).
 *
 * Source: PremiumPress-style theme with post_type `listing_type`
 * (see docs/wp-audit.md). Bedrooms/bathrooms are mainly taxonomies
 * (beds/baths) and will be joined in a later ETL pass.
 */
export const META = {
  price: 'price',
  bedrooms: 'custom-15', // often used as room count in this install
  bathrooms: 'property_bathrooms', // not present on audited listings
  rooms: 'custom-15',
  sizeSqm: 'size',
  landSqm: 'property_lot_size',
  floor: 'property_floor',
  yearBuilt: 'property_year',
  energyClass: 'property_energy_class',
  condition: 'property_condition',
  transactionType: 'status', // PremiumPress status codes; normalizeTransaction may return null
  address: 'map-location',
  city: 'map-city',
  province: 'map-city',
  postalCode: 'property_zip',
  latitude: 'map-lat',
  longitude: 'map-log',
  featuredImage: '_thumbnail_id',
  gallery: 'image_array', // PHP serialized array of image objects
  qrCode: 'property_qr',
} as const;

export type MetaKey = keyof typeof META;

/** Map a raw WP transaction string to our enum. */
export function normalizeTransaction(raw?: string): 'sale' | 'rent' | null {
  if (raw == null || raw === '') return null;
  const s = raw.toLowerCase();
  // PremiumPress listing status is often numeric; default to sale for active listings.
  if (s === '0' || s === '1') return 'sale';
  if (s.includes('rent') || s.includes('affitt') || s.includes('alquil')) return 'rent';
  if (s.includes('sale') || s.includes('vend') || s.includes('vent')) return 'sale';
  return null;
}
