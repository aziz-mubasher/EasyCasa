import { describe, expect, it } from 'vitest';
import { buildQuote, QuoteError } from './pricing';

describe('buildQuote', () => {
  it('single fixed service adds 22% IVA', () => {
    const q = buildQuote({ items: ['VALUATION'] });
    expect(q.fixedNetCents).toBe(9900);
    expect(q.ivaCents).toBe(2178);
    expect(q.dueNowGrossCents).toBe(12078);
    expect(q.estimatedTotalGrossCents).toBe(12078);
  });

  it('passthrough item carries no EasyCasa IVA', () => {
    const q = buildQuote({ items: ['CATASTO_RETRIEVAL'] });
    expect(q.passthroughCents).toBe(3500);
    expect(q.ivaCents).toBe(0);
    expect(q.dueNowGrossCents).toBe(3500);
  });

  it('provvigione is estimated from reference value and excluded from due-now', () => {
    const q = buildQuote({
      items: ['FULL_MEDIATION'],
      referenceValueCents: 30_000_000,
    });
    expect(q.provvigioneEstimatedNetCents).toBe(747_000);
    const line = q.lines.find((l) => l.code === 'FULL_MEDIATION');
    expect(line?.estimated).toBe(true);
    expect(q.dueNowGrossCents).toBe(0);
    expect(q.estimatedTotalGrossCents).toBe(747_000 + Math.round(747_000 * 0.22));
  });

  it('provvigione without reference value estimates to zero but stays flagged', () => {
    const q = buildQuote({ items: ['FULL_MEDIATION'] });
    expect(q.provvigioneEstimatedNetCents).toBe(0);
    expect(q.lines[0]?.estimated).toBe(true);
  });

  it('package emits one bundle line and covers its fixed items', () => {
    const q = buildQuote({ packageCode: 'FAI_DA_TE' });
    const bundle = q.lines.find((l) => l.kind === 'bundle');
    expect(bundle).toBeTruthy();
    expect(bundle?.netCents).toBe(19900);
    expect(bundle?.ivaCents).toBe(4378);
    expect(q.lines.filter((l) => l.kind === 'fixed')).toHaveLength(0);
  });

  it('package + à la carte does not double-charge a covered item', () => {
    const q = buildQuote({ packageCode: 'FAI_DA_TE', items: ['VALUATION'] });
    expect(q.lines.filter((l) => l.code === 'VALUATION')).toHaveLength(0);
  });

  it('Assistito bundle itemises provvigione separately from the fixed bundle', () => {
    const q = buildQuote({ packageCode: 'ASSISTITO', referenceValueCents: 20_000_000 });
    expect(q.lines.some((l) => l.kind === 'bundle')).toBe(true);
    const med = q.lines.find((l) => l.code === 'FULL_MEDIATION');
    expect(med?.kind).toBe('provvigione');
    expect(med?.estimated).toBe(true);
    expect(med?.netCents).toBe(Math.round(20_000_000 * 0.0249));
  });

  it('rental package keeps registration taxes as pass-through', () => {
    const q = buildQuote({ packageCode: 'AFFITTO_SERENO' });
    expect(q.lines.some((l) => l.code === 'REGISTRATION_TAXES' && l.kind === 'passthrough')).toBe(
      true,
    );
  });

  it('empty quote throws', () => {
    expect(() => buildQuote({})).toThrow(QuoteError);
  });

  it('unknown item throws', () => {
    expect(() => buildQuote({ items: ['NOPE'] })).toThrow(QuoteError);
  });
});
