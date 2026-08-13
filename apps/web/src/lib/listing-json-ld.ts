import { buildRealEstateListing, serializeJsonLd, type ListingSeoInput } from '@easycasa/shared';

export type ListingSchemaType = ListingSeoInput['schemaType'];

const SCHEMA_BY_PROPERTY_TYPE: Record<string, ListingSchemaType> = {
  apartment: 'Apartment',
  house: 'House',
  villa: 'SingleFamilyResidence',
  room: 'Apartment',
  land: 'Residence',
  commercial: 'Residence',
};

export function listingPropertyTypeToSchemaType(propertyType: string | null | undefined): ListingSchemaType {
  if (!propertyType) return 'Apartment';
  return SCHEMA_BY_PROPERTY_TYPE[propertyType.toLowerCase()] ?? 'Apartment';
}

export type ListingJsonLdInput = {
  slug: string;
  locale: string;
  site?: string;
  title: string;
  description?: string | null;
  price?: number | null;
  city?: string | null;
  province?: string | null;
  sizeSqm?: number | null;
  rooms?: number | null;
  bedrooms?: number | null;
  propertyType?: string | null;
  images?: readonly string[];
  firstPublishedAt?: Date;
};

export function buildListingJsonLdInput(input: ListingJsonLdInput): ListingSeoInput | null {
  const site = input.site ?? 'https://easycasaita.com';
  const price = input.price;
  if (price == null || !(price > 0)) return null;

  const url = `${site}/${input.locale}/listings/${input.slug}`;
  const sqm = input.sizeSqm ?? 0;
  const rooms = input.rooms ?? input.bedrooms ?? 0;

  return {
    url,
    title: input.title,
    description: input.description?.trim() || input.title,
    priceEur: price,
    sqm: sqm > 0 ? sqm : 1,
    rooms,
    schemaType: listingPropertyTypeToSchemaType(input.propertyType),
    comune: input.city?.trim() || 'Italia',
    provincia: input.province?.trim() || 'IT',
    images: input.images ?? [],
    firstPublishedAt: input.firstPublishedAt,
  };
}

export function buildListingJsonLd(input: ListingJsonLdInput): Record<string, unknown> | null {
  const seo = buildListingJsonLdInput(input);
  if (!seo) return null;
  return buildRealEstateListing(seo);
}

export function serializeListingJsonLd(input: ListingJsonLdInput): string | null {
  const obj = buildListingJsonLd(input);
  if (!obj) return null;
  return serializeJsonLd(obj);
}
