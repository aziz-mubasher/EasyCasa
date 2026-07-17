import { describe, expect, it } from 'vitest';

import { deriveMandate, resolveOrderItemCodes } from './legal-basis';
import type { LegalBasis } from './types';

const packages: Record<string, readonly string[]> = {
  ASSISTITO: ['LISTING_PUBLICATION', 'DOC_CHECKUP', 'VALUATION', 'MEDIA_PACK', 'FULL_MEDIATION'],
};

describe('resolveOrderItemCodes', () => {
  it('expands a package and merges à la carte', () => {
    const codes = resolveOrderItemCodes(
      { packageCode: 'ASSISTITO', items: ['VIRTUAL_TOUR'] },
      packages,
    );
    expect(codes).toContain('FULL_MEDIATION');
    expect(codes).toContain('VIRTUAL_TOUR');
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('dedupes overlap between package and à la carte', () => {
    const codes = resolveOrderItemCodes(
      { packageCode: 'ASSISTITO', items: ['VALUATION'] },
      packages,
    );
    expect(codes.filter((c) => c === 'VALUATION')).toHaveLength(1);
  });
});

const legalMap: Record<string, LegalBasis> = {
  FULL_MEDIATION: 'MEDIAZIONE',
  DOC_CHECKUP: 'MANDATO_ONEROSO',
  APE_ISSUANCE: 'MANDATO_ONEROSO',
  VALUATION: 'MANDATO_ONEROSO',
  LISTING_PUBLICATION: 'MANDATO_ONEROSO',
  MEDIA_PACK: 'MANDATO_ONEROSO',
};

describe('deriveMandate', () => {
  it('mediation-only order derives MEDIAZIONE and can proceed', () => {
    const d = deriveMandate(['FULL_MEDIATION'], legalMap);
    expect(d.types).toEqual(['MEDIAZIONE']);
    expect(d.reviewRequiredItems).toHaveLength(0);
    expect(d.canProceed).toBe(true);
  });

  it('owner-paid service order derives MANDATO_ONEROSO', () => {
    const d = deriveMandate(['DOC_CHECKUP', 'VALUATION'], legalMap);
    expect(d.types).toEqual(['MANDATO_ONEROSO']);
    expect(d.canProceed).toBe(true);
  });

  it('mixed order surfaces both figures', () => {
    const d = deriveMandate(['FULL_MEDIATION', 'DOC_CHECKUP'], legalMap);
    expect(d.types).toHaveLength(2);
    expect(d.types).toContain('MEDIAZIONE');
    expect(d.types).toContain('MANDATO_ONEROSO');
    expect(d.canProceed).toBe(true);
  });

  it('unclassified item blocks the mandate', () => {
    const d = deriveMandate(['FULL_MEDIATION', 'SOME_NEW_SERVICE'], legalMap);
    expect(d.reviewRequiredItems).toEqual(['SOME_NEW_SERVICE']);
    expect(d.canProceed).toBe(false);
  });

  it('explicit REVIEW_REQUIRED also blocks', () => {
    const d = deriveMandate(['X'], { X: 'REVIEW_REQUIRED' });
    expect(d.canProceed).toBe(false);
    expect(d.types).toHaveLength(0);
  });

  it('empty order cannot proceed', () => {
    const d = deriveMandate([], legalMap);
    expect(d.canProceed).toBe(false);
  });
});
