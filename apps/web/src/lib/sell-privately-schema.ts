import { buildFaqPage } from '@easycasa/shared';

export type SellPrivatelyFaqItem = { q: string; a: string };

export type SellPrivatelyServiceInput = {
  pageUrl: string;
  site: string;
  serviceName: string;
  description: string;
  serviceType: string;
  offerDescription: string;
  liveBenefits: ReadonlyArray<{ id: string; title: string; body: string }>;
};

export function buildSellPrivatelyServiceLd(input: SellPrivatelyServiceInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: input.serviceName,
    description: input.description,
    url: input.pageUrl,
    serviceType: input.serviceType,
    provider: {
      '@type': 'Organization',
      name: 'EasyCasa',
      legalName: 'MUNDIDA S.r.l.',
      url: input.site,
      taxID: 'IT04531990986',
    },
    areaServed: { '@type': 'Country', name: 'Italy' },
    availableLanguage: ['it', 'en', 'es'],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
      description: input.offerDescription,
    },
    additionalProperty: input.liveBenefits.map((b) => ({
      '@type': 'PropertyValue',
      name: b.title,
      value: b.body,
    })),
  };
}

export function buildSellPrivatelyFaqLd(faq: readonly SellPrivatelyFaqItem[]): Record<string, unknown> {
  return buildFaqPage(faq.map((item) => ({ question: item.q, answer: item.a })));
}
