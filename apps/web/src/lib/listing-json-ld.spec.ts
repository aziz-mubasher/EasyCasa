import { describe, expect, it } from 'vitest';
import {
  buildListingJsonLd,
  listingPropertyTypeToSchemaType,
  serializeListingJsonLd,
} from './listing-json-ld';

describe('listing-json-ld (T33 StructuredData wiring)', () => {
  const base = {
    slug: 'via-roma-1-brescia',
    locale: 'it',
    site: 'https://easycasaita.com',
    title: 'Trilocale luminoso',
    description: 'Appartamento di 95 mq</script><script>alert(1)</script>',
    price: 250_000,
    city: 'Brescia',
    province: 'BS',
    sizeSqm: 95,
    rooms: 3,
    propertyType: 'apartment',
    images: ['https://cdn.easycasaita.com/media/ab/cd123.webp'],
    firstPublishedAt: new Date('2026-05-01T09:00:00Z'),
  };

  it('maps property types to schema.org residence types', () => {
    expect(listingPropertyTypeToSchemaType('apartment')).toBe('Apartment');
    expect(listingPropertyTypeToSchemaType('villa')).toBe('SingleFamilyResidence');
    expect(listingPropertyTypeToSchemaType(undefined)).toBe('Apartment');
  });

  it('builds RealEstateListing (not Product) with honest datePosted', () => {
    const o = buildListingJsonLd(base)!;
    expect(o['@type']).toBe('RealEstateListing');
    expect(o.datePosted).toBe('2026-05-01T09:00:00.000Z');
    const about = o.about as Record<string, unknown>;
    expect(about['@type']).toBe('Apartment');
    const offers = o.offers as Record<string, unknown>;
    expect(offers.price).toBe(250_000);
    expect((offers.offeredBy as Record<string, unknown>).name).toBe('Privato');
  });

  it('serializeListingJsonLd uses serializeJsonLd injection safety', () => {
    const s = serializeListingJsonLd(base)!;
    expect(s).not.toContain('</script>');
    expect(s).toContain('\\u003c');
    const parsed = JSON.parse(s) as Record<string, unknown>;
    expect(parsed.description).toContain('</script>');
  });

  it('returns null when price is missing or non-positive', () => {
    expect(buildListingJsonLd({ ...base, price: null })).toBeNull();
    expect(buildListingJsonLd({ ...base, price: 0 })).toBeNull();
  });
});
