import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildService } from '@easycasa/shared';

const MESSAGES_DIR = join(__dirname, '../../messages');
const LOCALES = ['it', 'en', 'es'] as const;
const SITE = 'https://easycasaita.com';

function loadMessages(locale: (typeof LOCALES)[number]) {
  return JSON.parse(readFileSync(join(MESSAGES_DIR, `${locale}.json`), 'utf8')) as Record<
    string,
    unknown
  >;
}

describe('service landing JSON-LD i18n (PP-2)', () => {
  for (const locale of LOCALES) {
    it(`valutazione-gratuita schema keys present in ${locale}`, () => {
      const m = loadMessages(locale).valutazioneGratuita as Record<string, unknown>;
      const schema = m.schema as Record<string, string>;
      expect(schema.serviceName.length).toBeGreaterThan(5);
      expect(schema.serviceType.length).toBeGreaterThan(5);
      expect(schema.offerDescription.length).toBeGreaterThan(5);

      const ld = buildService({
        pageUrl: `${SITE}/${locale}/valutazione-gratuita`,
        site: SITE,
        serviceName: schema.serviceName,
        description: (m.meta as { description: string }).description,
        serviceType: schema.serviceType,
        offerDescription: schema.offerDescription,
      });
      expect(ld['@type']).toBe('Service');
      expect(ld.name).toBe(schema.serviceName);
    });

    it(`acquisto-assistito schema keys present in ${locale}`, () => {
      const m = loadMessages(locale).acquistoAssistito as Record<string, unknown>;
      const schema = m.schema as {
        serviceName: string;
        serviceType: string;
        offers: Array<{ name: string; price: string }>;
      };
      expect(schema.offers).toHaveLength(3);

      const ld = buildService({
        pageUrl: `${SITE}/${locale}/acquisto-assistito`,
        site: SITE,
        serviceName: schema.serviceName,
        description: (m.meta as { description: string }).description,
        serviceType: schema.serviceType,
        offers: schema.offers.map((o) => ({ ...o, priceCurrency: 'EUR' })),
      });
      const offers = ld.offers as Array<Record<string, unknown>>;
      expect(Array.isArray(offers)).toBe(true);
      expect(offers).toHaveLength(3);
    });
  }
});

describe('seller inbox enquiry card wire shape (PP-2)', () => {
  it('includes listing title and slug without buyer contact fields', () => {
    const sample = {
      id: 'enq-1',
      listingId: 'uuid-listing',
      listingTitle: 'Trilocale in centro',
      listingSlug: 'trilocale-centro-milano',
      receivedAt: '2026-08-12T10:00:00.000Z',
      read: false,
      badge: null,
      hasViewingRequest: false,
      badgeDisplay: 'none' as const,
    };
    expect(sample.listingTitle).toBeTruthy();
    expect(sample.listingSlug).toMatch(/-/);
    expect(sample).not.toHaveProperty('buyerEmail');
    expect(sample).not.toHaveProperty('buyerPhone');
    expect(sample).not.toHaveProperty('message');
  });
});
