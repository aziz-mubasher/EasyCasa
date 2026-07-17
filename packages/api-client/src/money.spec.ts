import { describe, expect, it } from 'vitest';
import { formatEuroCents, summarizeQuote } from './money';
import type { Quote } from './phase8';

describe('formatEuroCents', () => {
  it('formats whole and fractional euros with Italian separators', () => {
    expect(formatEuroCents(0)).toBe('€ 0,00');
    expect(formatEuroCents(9900)).toBe('€ 99,00');
    expect(formatEuroCents(123456)).toBe('€ 1.234,56');
    expect(formatEuroCents(100000000)).toBe('€ 1.000.000,00');
    expect(formatEuroCents(5)).toBe('€ 0,05');
  });

  it('handles negatives', () => {
    expect(formatEuroCents(-2500)).toBe('-€ 25,00');
  });
});

const quote: Quote = {
  lines: [
    {
      code: 'DOC_CHECKUP',
      labelEn: 'Document check-up',
      labelIt: 'Check-up documentale',
      kind: 'fixed',
      netCents: 14900,
      ivaCents: 3278,
      grossCents: 18178,
      estimated: false,
    },
    {
      code: 'FULL_MEDIATION',
      labelEn: 'Full mediation',
      labelIt: 'Mediazione completa',
      kind: 'provvigione',
      netCents: 747000,
      ivaCents: 164340,
      grossCents: 911340,
      estimated: true,
      note: '2.49% — matures on conclusione',
    },
  ],
  fixedNetCents: 14900,
  provvigioneEstimatedNetCents: 747000,
  passthroughCents: 0,
  ivaCents: 167618,
  dueNowGrossCents: 18178,
  estimatedTotalGrossCents: 929518,
  currency: 'EUR',
};

describe('summarizeQuote', () => {
  it('picks Italian labels and flags estimates', () => {
    const d = summarizeQuote(quote, 'it-IT');
    expect(d.lines[0]?.label).toBe('Check-up documentale');
    expect(d.lines[1]?.label).toBe('Mediazione completa');
    expect(d.dueNow).toBe('€ 181,78');
    expect(d.estimatedTotal).toBe('€ 9.295,18');
    expect(d.hasEstimated).toBe(true);
    expect(d.lines[1]?.estimated).toBe(true);
    expect(d.lines[1]?.note).toBe('2.49% — matures on conclusione');
  });

  it('picks English labels for non-it locales', () => {
    const d = summarizeQuote(quote, 'en-GB');
    expect(d.lines[0]?.label).toBe('Document check-up');
  });
});
