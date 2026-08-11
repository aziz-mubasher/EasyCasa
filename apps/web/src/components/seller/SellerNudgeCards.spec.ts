/**
 * EC-S Phase 4 PR-1 — card render coverage per nudge code.
 * Uses next-intl translators (no RTL lib in web package); asserts every code
 * interpolates and is filterable into a card payload.
 */

import { createTranslator, type AbstractIntlMessages } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { NUDGE_CODES, type NudgeCode } from '@easycasa/shared';

import enMessages from '../../../messages/en.json';
import esMessages from '../../../messages/es.json';
import itMessages from '../../../messages/it.json';
import { filterNudgeItems, type SellerNudgeItem } from './SellerNudgeCards';

const LOCALES = {
  it: itMessages as unknown as AbstractIntlMessages,
  en: enMessages as unknown as AbstractIntlMessages,
  es: esMessages as unknown as AbstractIntlMessages,
} as const;

/** Minimal numeric payloads matching evaluateNudges output shapes. */
const PAYLOADS: Record<NudgeCode, Record<string, number>> = {
  LOW_ENQUIRY_RATE: { views: 400, enquiries: 2 },
  ABOVE_OMI_BAND: { pct: 24 },
  BELOW_OMI_BAND: { pct: 25 },
  LONG_ON_MARKET: { days: 90, zoneMedian: 60 },
  STALE_NO_VIEWS: { days: 30, views: 10 },
};

describe('SellerNudgeCards render (PR-1 wiring)', () => {
  for (const code of NUDGE_CODES) {
    it(`renders ${code} card copy in all locales with interpolation`, () => {
      for (const [locale, messages] of Object.entries(LOCALES)) {
        const t = createTranslator({ locale, messages, namespace: 'nudges' });
        const text = t(code, PAYLOADS[code]);
        expect(text.length).toBeGreaterThan(8);
        // Interpolated numbers must appear (no leftover {placeholders}).
        expect(text).not.toMatch(/\{[a-zA-Z]+\}/);
        for (const v of Object.values(PAYLOADS[code])) {
          expect(text).toContain(String(v));
        }
      }
    });
  }

  it('filterNudgeItems keeps known codes in NUDGE_CODES order and drops junk', () => {
    const raw: Array<{ code: string; emittedAt: string; data?: Record<string, number> }> = [
      {
        code: 'STALE_NO_VIEWS',
        emittedAt: '2026-08-11T00:00:00.000Z',
        data: { days: 30, views: 10 },
      },
      { code: 'NOT_A_CODE', emittedAt: '2026-08-11T00:00:00.000Z', data: {} },
      {
        code: 'LOW_ENQUIRY_RATE',
        emittedAt: '2026-08-10T00:00:00.000Z',
        data: { views: 400, enquiries: 2 },
      },
    ];
    const items: SellerNudgeItem[] = filterNudgeItems(raw);
    expect(items.map((i) => i.code)).toEqual(['LOW_ENQUIRY_RATE', 'STALE_NO_VIEWS']);
  });
});
