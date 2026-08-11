/**
 * EC-S-T32 item 11 — consentUpdate i18n (T30 banner / interstitial).
 */

import { describe, expect, it } from 'vitest';
import itMsg from '../../messages/it.json';
import enMsg from '../../messages/en.json';
import esMsg from '../../messages/es.json';

const KEYS = [
  'bannerText',
  'bannerLink',
  'bannerDismiss',
  'interstitialTitle',
  'interstitialBody',
  'interstitialReadLink',
  'interstitialAccept',
  'interstitialLater',
  'interstitialLaterNote',
  'errorIntegrity',
] as const;

describe('consentUpdate i18n (T32 / T30)', () => {
  it('IT master includes exact counsel-ready strings', () => {
    const c = itMsg.consentUpdate;
    expect(c.bannerText).toBe(
      "Abbiamo aggiornato l'informativa privacy (versione {version}). Le modifiche sono minori e non richiedono alcuna azione.",
    );
    expect(c.interstitialBody).toBe(
      "L'informativa è stata aggiornata alla versione {version} con modifiche sostanziali. Per continuare a usare gli strumenti di vendita è necessario prenderne visione e accettarla.",
    );
    expect(c.interstitialAccept).toBe('Ho letto e accetto');
  });

  it('EN/ES have the same key set', () => {
    for (const key of KEYS) {
      expect(itMsg.consentUpdate[key], `it.${key}`).toBeTruthy();
      expect(enMsg.consentUpdate[key], `en.${key}`).toBeTruthy();
      expect(esMsg.consentUpdate[key], `es.${key}`).toBeTruthy();
    }
  });
});
