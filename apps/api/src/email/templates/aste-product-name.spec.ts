import { describe, expect, it } from 'vitest';

import {
  ASTE_PRODUCT_NAME,
  ASTE_PRODUCT_NAME_LEGACY_BANNED,
  asteCreditPackProductName,
  asteProductDisplayName,
} from '@easycasa/shared';

import { asteGuideDelivery } from './templates';

describe('EC-RENAME-1 aste product naming', () => {
  it('SSOT display names are Dossier Asta / Auction Dossier / Dossier de Subasta', () => {
    expect(ASTE_PRODUCT_NAME.it).toBe('Dossier Asta');
    expect(ASTE_PRODUCT_NAME.en).toBe('Auction Dossier');
    expect(ASTE_PRODUCT_NAME.es).toBe('Dossier de Subasta');
    expect(asteProductDisplayName('it')).toBe('Dossier Asta');
  });

  it('Stripe credit pack name reads from SSOT (IT canonical)', () => {
    expect(asteCreditPackProductName(1)).toBe('Dossier Asta — 1 credit');
    expect(asteCreditPackProductName(3)).toBe('Dossier Asta — 3 credits');
  });

  it('guide delivery email embeds locale display name from SSOT', () => {
    const it = asteGuideDelivery({ guideUrl: 'https://example.com/g', language: 'it' }, 'it');
    expect(it.text).toContain(ASTE_PRODUCT_NAME.it);
    expect(it.html).toContain(ASTE_PRODUCT_NAME.it);

    const en = asteGuideDelivery({ guideUrl: 'https://example.com/g', language: 'en' }, 'en');
    expect(en.text).toContain(ASTE_PRODUCT_NAME.en);

    const es = asteGuideDelivery({ guideUrl: 'https://example.com/g', language: 'es' }, 'es');
    expect(es.text).toContain(ASTE_PRODUCT_NAME.es);
  });

  it('legacy product brand strings do not appear in guide emails or Stripe names', () => {
    const surfaces = [
      asteCreditPackProductName(1),
      asteGuideDelivery({ guideUrl: 'https://x', language: 'it' }, 'it').text,
      asteGuideDelivery({ guideUrl: 'https://x', language: 'en' }, 'en').text,
      asteGuideDelivery({ guideUrl: 'https://x', language: 'es' }, 'es').text,
    ].join('\n');
    for (const banned of ASTE_PRODUCT_NAME_LEGACY_BANNED) {
      expect(surfaces.includes(banned)).toBe(false);
    }
  });
});
