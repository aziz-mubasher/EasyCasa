import { describe, expect, it } from 'vitest';

import {
  formatOmiScontoRealePct,
  formatReportMoney,
  isEconFieldPresent,
  omiHeadlineRenderable,
} from './aste-report-display';

describe('aste-report-display (EC-24-VERIFY)', () => {
  describe('formatOmiScontoRealePct', () => {
    it('null / undefined / NaN → em dash (non rilevato path)', () => {
      expect(formatOmiScontoRealePct(null)).toBe('—');
      expect(formatOmiScontoRealePct(undefined)).toBe('—');
      expect(formatOmiScontoRealePct(Number.NaN)).toBe('—');
    });

    it('finite pct → percentage string', () => {
      expect(formatOmiScontoRealePct(12.5)).toBe('12.5%');
    });
  });

  describe('formatReportMoney', () => {
    it('null → em dash for missing stima row', () => {
      expect(formatReportMoney(null, 'it')).toBe('—');
    });
  });

  describe('isEconFieldPresent', () => {
    it('null valore_stima → not present', () => {
      expect(isEconFieldPresent(null)).toBe(false);
    });

    it('nested { value, source } → present', () => {
      expect(
        isEconFieldPresent({ value: 250_000, source: { file: 'p', page: 1 } }),
      ).toBe(true);
    });
  });

  describe('omiHeadlineRenderable (EC-27 teaser contract)', () => {
    it('renders when OMI band available even if sconto null', () => {
      expect(
        omiHeadlineRenderable({
          available: true,
          omi_range: { min: 200_000, max: 300_000, mid: 250_000 },
        }),
      ).toBe(true);
    });

    it('does not require valore_stima — unavailable OMI → false', () => {
      expect(omiHeadlineRenderable({ available: false, omi_range: null })).toBe(false);
    });
  });
});
