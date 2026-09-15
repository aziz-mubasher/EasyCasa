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

  it('rejects a deactivated item (not just hiding the card)', () => {
    expect(() => buildQuote({ items: ['FULL_MEDIATION'] })).toThrow(QuoteError);
    expect(() => buildQuote({ items: ['OFFER_DRAFTING'] })).toThrow(/not available/);
    expect(() => buildQuote({ items: ['APE_ISSUANCE'] })).toThrow(/not available/);
    expect(() => buildQuote({ items: ['TENANT_SCREENING'] })).toThrow(/not available/);
    expect(() => buildQuote({ items: ['VIEWING_ACCOMPANIMENT'] })).toThrow(/not available/);
    expect(() => buildQuote({ items: ['ROGITO_COORDINATION'] })).toThrow(/not available/);
  });

  it('rejects a deactivated package and a package that contains mediation', () => {
    expect(() => buildQuote({ packageCode: 'FAI_DA_TE' })).toThrow(/not available/);
    expect(() => buildQuote({ packageCode: 'CHIAVI_IN_MANO' })).toThrow(/not available/);
    expect(() => buildQuote({ packageCode: 'ASSISTITO' })).toThrow(/not available/);
    expect(() => buildQuote({ packageCode: 'AFFITTO_SERENO' })).toThrow(/not available/);
  });

  it('Ready to list emits one bundle line and covers its fixed items', () => {
    const q = buildQuote({ packageCode: 'READY_TO_LIST' });
    const bundle = q.lines.find((l) => l.kind === 'bundle');
    expect(bundle).toBeTruthy();
    expect(bundle?.netCents).toBe(25900);
    expect(bundle?.ivaCents).toBe(5698);
    expect(q.lines.filter((l) => l.kind === 'fixed')).toHaveLength(0);
  });

  it('package + à la carte does not double-charge a covered item', () => {
    const q = buildQuote({ packageCode: 'READY_TO_LIST', items: ['VALUATION'] });
    expect(q.lines.filter((l) => l.code === 'VALUATION')).toHaveLength(0);
  });

  it('renting bundle has no tenant screening and no pass-through leftover', () => {
    const q = buildQuote({ packageCode: 'RENTING_MADE_SIMPLE' });
    expect(q.lines.some((l) => l.code === 'TENANT_SCREENING')).toBe(false);
    expect(q.lines.some((l) => l.kind === 'provvigione')).toBe(false);
    expect(q.fixedNetCents).toBe(18900);
  });

  it('empty quote throws', () => {
    expect(() => buildQuote({})).toThrow(QuoteError);
  });

  it('unknown item throws', () => {
    expect(() => buildQuote({ items: ['NOPE'] })).toThrow(QuoteError);
  });
});
