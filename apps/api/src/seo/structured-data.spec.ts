/**
 * EC-S-T33 HOLD — JSON-LD builder tests (shared artifact; not wired to Next yet).
 * Includes </script> injection safety — seller-authored text is the attack surface.
 */

import { describe, it, expect } from 'vitest';
import {
  buildRealEstateListing,
  buildFaqPage,
  serializeJsonLd,
  type ListingSeoInput,
} from '@easycasa/shared';

const listing: ListingSeoInput = {
  url: 'https://easycasaita.com/it/immobili/via-roma-1-brescia',
  title: 'Trilocale luminoso in centro',
  description: 'Appartamento di 95 mq con tre stanze.',
  priceEur: 250_000,
  sqm: 95,
  rooms: 3,
  schemaType: 'Apartment',
  comune: 'Brescia',
  provincia: 'BS',
  images: ['https://cdn.easycasaita.com/media/ab/cd123.webp'],
  firstPublishedAt: new Date('2026-05-01T09:00:00Z'),
};

describe('buildRealEstateListing (T33 HOLD)', () => {
  it('produces a valid RealEstateListing shape', () => {
    const o = buildRealEstateListing(listing);
    expect(o['@type']).toBe('RealEstateListing');
    expect(o['@context']).toBe('https://schema.org');
    const about = o.about as Record<string, unknown>;
    expect(about['@type']).toBe('Apartment');
    expect((about.floorSize as Record<string, unknown>).unitCode).toBe('MTK');
    const offers = o.offers as Record<string, unknown>;
    expect(offers.price).toBe(250_000);
    expect(offers.priceCurrency).toBe('EUR');
  });

  it('uses honest datePosted from sticky first publish', () => {
    expect(buildRealEstateListing(listing).datePosted).toBe('2026-05-01T09:00:00.000Z');
    const rest = { ...listing };
    delete (rest as { firstPublishedAt?: Date }).firstPublishedAt;
    expect(buildRealEstateListing(rest)).not.toHaveProperty('datePosted');
  });

  it('keeps seller PII out — offeredBy is generic', () => {
    const offers = buildRealEstateListing(listing).offers as Record<string, unknown>;
    expect((offers.offeredBy as Record<string, unknown>).name).toBe('Privato');
  });

  it('guards: absolute https url and positive price', () => {
    expect(() => buildRealEstateListing({ ...listing, url: '/it/immobili/x' })).toThrow(
      /absolute https/,
    );
    expect(() => buildRealEstateListing({ ...listing, priceEur: 0 })).toThrow(/positive/);
  });

  it('omits image key when no images', () => {
    expect(buildRealEstateListing({ ...listing, images: [] })).not.toHaveProperty('image');
  });
});

describe('buildFaqPage (T33 HOLD)', () => {
  it('maps items to Question/Answer', () => {
    const o = buildFaqPage([{ question: 'È gratuito?', answer: 'Sì, pubblicare è gratuito.' }]);
    const main = o.mainEntity as Array<Record<string, unknown>>;
    expect(main).toHaveLength(1);
    expect(main[0]!['@type']).toBe('Question');
    expect((main[0]!.acceptedAnswer as Record<string, unknown>)['@type']).toBe('Answer');
  });

  it('refuses an empty FAQ', () => {
    expect(() => buildFaqPage([])).toThrow(/at least one/);
  });
});

describe('serializeJsonLd — injection safety (T33 HOLD)', () => {
  it('neutralises </script> in seller-authored text', () => {
    const evil = buildRealEstateListing({
      ...listing,
      description: 'Bella casa</script><script>alert(1)</script>',
    });
    const s = serializeJsonLd(evil);
    expect(s).not.toContain('</script>');
    expect(s).not.toContain('<script>');
    expect(s).toContain('\\u003c');
    const parsed = JSON.parse(s) as Record<string, unknown>;
    expect(parsed.description).toContain('</script>');
  });

  it('escapes ampersands', () => {
    const s = serializeJsonLd(buildFaqPage([{ question: 'A & B?', answer: 'C & D.' }]));
    expect(s).toContain('\\u0026');
  });
});
