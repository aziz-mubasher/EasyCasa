import { describe, expect, it } from 'vitest';
import { buildSellPrivatelyFaqLd, buildSellPrivatelyServiceLd } from './sell-privately-schema';

describe('sell-privately schema (T33 G4 i18n-only)', () => {
  const service = buildSellPrivatelyServiceLd({
    pageUrl: 'https://easycasaita.com/it/vendi-da-privato',
    site: 'https://easycasaita.com',
    serviceName: 'Vendere da privato su EasyCasa',
    description: 'Annuncio privato gratuito.',
    serviceType: 'Portale di annunci immobiliari tra privati',
    offerDescription: 'Annuncio privato gratuito — nessuna provvigione',
    liveBenefits: [{ id: 'P1', title: 'Pubblicazione gratuita', body: 'Pubblica senza costi.' }],
  });

  const faq = buildSellPrivatelyFaqLd([
    { q: 'È gratuito?', a: 'Sì, pubblicare è gratuito.' },
    { q: 'Serve un\'agenzia?', a: 'No, vendi da privato.' },
  ]);

  it('Service schema has required Service fields', () => {
    expect(service['@type']).toBe('Service');
    expect(service['@context']).toBe('https://schema.org');
    expect(service.name).toBe('Vendere da privato su EasyCasa');
    expect(service.url).toBe('https://easycasaita.com/it/vendi-da-privato');
    const provider = service.provider as Record<string, unknown>;
    expect(provider['@type']).toBe('Organization');
    const offers = service.offers as Record<string, unknown>;
    expect(offers.price).toBe('0');
    expect(offers.priceCurrency).toBe('EUR');
    const props = service.additionalProperty as Array<Record<string, unknown>>;
    expect(props[0]!['@type']).toBe('PropertyValue');
  });

  it('FAQPage schema maps Question/Answer entities', () => {
    expect(faq['@type']).toBe('FAQPage');
    const main = faq.mainEntity as Array<Record<string, unknown>>;
    expect(main).toHaveLength(2);
    expect(main[0]!['@type']).toBe('Question');
    expect((main[0]!.acceptedAnswer as Record<string, unknown>)['@type']).toBe('Answer');
  });
});
