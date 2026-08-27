import { describe, expect, it } from 'vitest';

import {
  ASTE_PRODUCT_AI_DISCLOSURE,
  ASTE_PRODUCT_NAME,
  ASTE_PRODUCT_NAME_LEGACY_BANNED,
  ASTE_PRODUCT_SLUG,
  ASTE_PRODUCT_TAGLINE,
  asteCreditPackProductName,
  asteProductAiDisclosure,
  asteProductDisplayName,
  asteProductTagline,
} from '@easycasa/shared';

import { asteGuideDelivery } from './templates';

describe('EC-RENAME-2 Legenda product naming', () => {
  it('SSOT is Legenda across locales with slug and tagline', () => {
    expect(ASTE_PRODUCT_SLUG).toBe('legenda');
    expect(ASTE_PRODUCT_NAME.it).toBe('Legenda');
    expect(ASTE_PRODUCT_NAME.en).toBe('Legenda');
    expect(ASTE_PRODUCT_NAME.es).toBe('Legenda');
    expect(asteProductDisplayName('it')).toBe('Legenda');
    expect(asteProductTagline('it')).toBe(ASTE_PRODUCT_TAGLINE.it);
    expect(asteProductAiDisclosure('en')).toBe(ASTE_PRODUCT_AI_DISCLOSURE.en);
  });

  it('Stripe credit pack name reads from SSOT', () => {
    expect(asteCreditPackProductName(1)).toBe('Legenda — 1 credit');
    expect(asteCreditPackProductName(3)).toBe('Legenda — 3 credits');
  });

  it('guide delivery email embeds Legenda from SSOT', () => {
    for (const loc of ['it', 'en', 'es'] as const) {
      const r = asteGuideDelivery({ guideUrl: 'https://example.com/g', language: loc }, loc);
      expect(r.text).toContain('Legenda');
      expect(r.html).toContain('Legenda');
    }
  });

  it('legacy product brands do not appear in guide emails or Stripe names', () => {
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
