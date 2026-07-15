/**
 * WordPress real-estate plugin meta-key mapping.
 *
 * IMPORTANT: These keys are plugin-specific. Run the queries in
 * docs/wp-audit.md against the real database and replace the RIGHT-hand
 * values below with the actual meta_key names before running the ETL.
 */
export const META = {
  price: 'property_price',
  bedrooms: 'property_bedrooms',
  bathrooms: 'property_bathrooms',
  rooms: 'property_rooms',
  sizeSqm: 'property_size',
  landSqm: 'property_lot_size',
  floor: 'property_floor',
  yearBuilt: 'property_year',
  energyClass: 'property_energy_class',
  condition: 'property_condition',
  transactionType: 'property_action_category', // sale/rent
  address: 'property_address',
  city: 'property_city',
  province: 'property_county',
  postalCode: 'property_zip',
  latitude: 'property_latitude',
  longitude: 'property_longitude',
  featuredImage: '_thumbnail_id',
  gallery: 'property_gallery',
  qrCode: 'property_qr',
} as const;

export type MetaKey = keyof typeof META;

/** Map a raw WP transaction string to our enum. */
export function normalizeTransaction(raw?: string): 'sale' | 'rent' | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (s.includes('rent') || s.includes('affitt') || s.includes('alquil')) return 'rent';
  if (s.includes('sale') || s.includes('vend') || s.includes('vent')) return 'sale';
  return null;
}
