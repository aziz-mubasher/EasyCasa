import { describe, expect, it } from 'vitest';
import { evaluateFascicolo } from './gates';
import type { DocumentInstance, PropertyContext } from './types';

const NOW = new Date('2026-07-17T00:00:00Z');

function verified(code: DocumentInstance['code'], issuedAt = '2026-01-01'): DocumentInstance {
  return { code, issuedAt, verifiedAt: '2026-01-02' };
}

function ctx(partial: Partial<PropertyContext>): PropertyContext {
  return { dealType: 'sale', inCondominio: false, documents: [], ...partial };
}

describe('evaluateFascicolo', () => {
  it('no APE → cannot publish', () => {
    const r = evaluateFascicolo(ctx({ documents: [] }), NOW);
    expect(r.publish.allowed).toBe(false);
    expect(r.publish.blockers.some((b) => b.document === 'APE' && b.code === 'MISSING')).toBe(true);
  });

  it('valid verified APE → can publish', () => {
    const r = evaluateFascicolo(ctx({ documents: [verified('APE')] }), NOW);
    expect(r.publish.allowed).toBe(true);
    expect(r.publish.blockers).toHaveLength(0);
  });

  it('APE present but unverified → cannot publish', () => {
    const r = evaluateFascicolo(
      ctx({ documents: [{ code: 'APE', issuedAt: '2026-01-01' }] }),
      NOW,
    );
    expect(r.publish.allowed).toBe(false);
    expect(r.publish.blockers.some((b) => b.code === 'UNVERIFIED')).toBe(true);
  });

  it('APE older than 10 years → expired → cannot publish', () => {
    const r = evaluateFascicolo(ctx({ documents: [verified('APE', '2015-01-01')] }), NOW);
    expect(r.publish.allowed).toBe(false);
    expect(r.publish.blockers.some((b) => b.document === 'APE' && b.code === 'EXPIRED')).toBe(true);
  });

  it('can publish but cannot close without conformity + provenance', () => {
    const r = evaluateFascicolo(ctx({ documents: [verified('APE')] }), NOW);
    expect(r.publish.allowed).toBe(true);
    expect(r.close.allowed).toBe(false);
    const codes = r.close.blockers.map((b) => b.document);
    expect(codes).toContain('CONFORMITA_URBANISTICA_RTI');
    expect(codes).toContain('PLANIMETRIA_CATASTALE');
    expect(codes).toContain('ATTO_PROVENIENZA');
  });

  it('full sale document set → can close; agibilità only a warning', () => {
    const docs: DocumentInstance[] = [
      verified('APE'),
      verified('ATTO_PROVENIENZA'),
      verified('VISURA_CATASTALE', '2026-05-01'),
      verified('PLANIMETRIA_CATASTALE'),
      verified('CONFORMITA_URBANISTICA_RTI'),
      verified('IDENTITY'),
    ];
    const r = evaluateFascicolo(ctx({ documents: docs }), NOW);
    expect(r.close.allowed).toBe(true);
    expect(r.close.warnings.some((w) => w.document === 'AGIBILITA')).toBe(true);
  });

  it('condominium property additionally requires condominium docs to close', () => {
    const docs: DocumentInstance[] = [
      verified('APE'),
      verified('ATTO_PROVENIENZA'),
      verified('VISURA_CATASTALE', '2026-05-01'),
      verified('PLANIMETRIA_CATASTALE'),
      verified('CONFORMITA_URBANISTICA_RTI'),
      verified('IDENTITY'),
    ];
    const r = evaluateFascicolo(ctx({ documents: docs, inCondominio: true }), NOW);
    expect(r.close.allowed).toBe(false);
    expect(r.close.blockers.some((b) => b.document === 'DOC_CONDOMINIALE')).toBe(true);
  });

  it('non-condo does not require condominium docs', () => {
    const docs: DocumentInstance[] = [
      verified('APE'),
      verified('ATTO_PROVENIENZA'),
      verified('VISURA_CATASTALE', '2026-05-01'),
      verified('PLANIMETRIA_CATASTALE'),
      verified('CONFORMITA_URBANISTICA_RTI'),
      verified('IDENTITY'),
    ];
    const r = evaluateFascicolo(ctx({ documents: docs, inCondominio: false }), NOW);
    expect(r.close.allowed).toBe(true);
  });

  it('register lease requires APE + identity', () => {
    const r = evaluateFascicolo(ctx({ documents: [verified('APE')] }), NOW);
    expect(r.registerLease.allowed).toBe(false);
    expect(r.registerLease.blockers.some((b) => b.document === 'IDENTITY')).toBe(true);
  });

  it('APE + identity → can register lease', () => {
    const r = evaluateFascicolo(
      ctx({ documents: [verified('APE'), verified('IDENTITY')] }),
      NOW,
    );
    expect(r.registerLease.allowed).toBe(true);
  });
});
