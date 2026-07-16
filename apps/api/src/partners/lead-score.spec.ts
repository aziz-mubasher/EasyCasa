import { describe, it, expect } from 'vitest';
import { scoreLead, hasContactIntent } from './lead-score';

describe('lead scoring', () => {
  it('scores a detailed, intent-rich, returning buyer highly', () => {
    const s = scoreLead({ messageLength: 80, hasContactIntent: true, buyerHasHistory: true, priceKnown: true });
    expect(s).toBeGreaterThanOrEqual(90);
  });
  it('scores a thin anonymous message low', () => {
    const s = scoreLead({ messageLength: 5, hasContactIntent: false, buyerHasHistory: false, priceKnown: false });
    expect(s).toBeLessThan(30);
  });
  it('detects contact intent multilingually', () => {
    expect(hasContactIntent('Vorrei fissare una visita')).toBe(true);
    expect(hasContactIntent('me gustaría llamar')).toBe(true);
    expect(hasContactIntent('nice photos')).toBe(false);
  });
});
