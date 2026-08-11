import { describe, expect, it } from 'vitest';

import {
  applyPrezzoBasePrecedence,
  assertLotScope,
  AsteLotScopeError,
  isLotScopeFailureReason,
} from './aste-extract-guards';
import type { AsteExtractionV2 } from './extraction-schema';
import { emptyImmobileUnit } from './extraction-schema';

function base(): AsteExtractionV2 {
  return {
    schema_version: 2,
    procedura: {
      tipo: 'rge',
      numero: '1/2024',
      tribunale: 'Milano',
      rge: '1/2024',
      lotto: '1',
      giudice_delegato: null,
      data_asta: null,
      termine_offerte: null,
      modalita: 'telematica',
    },
    economics: {
      valore_stima: null,
      prezzo_base: { value: 100, source: { file: 'a1', page: 1 } },
      offerta_minima: null,
      cauzione: null,
      rilancio_minimo: null,
      superficie_commerciale_mq: null,
    },
    immobili: [emptyImmobileUnit()],
    giuridica: {
      diritto_venduto: null,
      stato_occupazione: { stato: null, dettaglio: null, opponibilita: null },
      vincoli: [],
      formalita: [],
    },
    urbanistica: {
      conformita_urbanistica: { stato: null, dettaglio: null },
      conformita_catastale: { stato: null, dettaglio: null },
      difformita: [],
    },
    condizioni: { stato_manutentivo: null, impianti: null, lavori_stimati: null },
    spese: { condominiali_arretrate: null, oneri_acquirente: [] },
    meta: {
      documents: [
        { file: 'a1', doc_type: 'avviso', pages: 1, ocr_pages: 0 },
        { file: 'ord', doc_type: 'ordinanza', pages: 1, ocr_pages: 0 },
      ],
      not_found: [],
      warnings: [],
      schema_version: 2,
      lotto: null,
      lotti_trovati: [],
    },
  };
}

describe('aste-extract-guards (EC-23b)', () => {
  it('lotto_selection_required when multi-lot and no label', () => {
    const ex = base();
    ex.meta.lotti_trovati = ['H', 'I', 'M'];
    expect(() => assertLotScope(ex, null)).toThrow(AsteLotScopeError);
    try {
      assertLotScope(ex, null);
    } catch (e) {
      expect((e as AsteLotScopeError).code).toBe('lotto_selection_required');
      expect((e as AsteLotScopeError).foundLabels).toEqual(['H', 'I', 'M']);
    }
  });

  it('lotto_not_found when label missing from found list', () => {
    const ex = base();
    ex.meta.lotti_trovati = ['4', '7'];
    expect(() => assertLotScope(ex, '9')).toThrow(/lotto_not_found/);
  });

  it('allows scoped label present in found list', () => {
    const ex = base();
    ex.meta.lotti_trovati = ['4', '7'];
    expect(() => assertLotScope(ex, '4')).not.toThrow();
  });

  it('prezzo_base precedence prefers avviso candidate', () => {
    const ex = base();
    ex.meta.prezzo_base_candidates = [
      { value: 85000, source: { file: 'ord', page: 1 } },
      { value: 36000, source: { file: 'a1', page: 1 } },
    ];
    ex.economics.prezzo_base = { value: 85000, source: { file: 'ord', page: 1 } };
    applyPrezzoBasePrecedence(ex);
    expect(ex.economics.prezzo_base?.value).toBe(36000);
    expect(ex.meta.warnings.some((w) => /precedente/.test(w))).toBe(true);
  });

  it('isLotScopeFailureReason detects codes', () => {
    expect(isLotScopeFailureReason('lotto_selection_required:H,I')).toBe(true);
    expect(isLotScopeFailureReason('ocr_error')).toBe(false);
  });
});

describe('aste-extract-guards traps (§5.6 fixtures)', () => {
  it('selection required trap', async () => {
    const { trapSelectionRequired } = await import(
      '../../test/fixtures/aste/schema-v2-traps'
    );
    const ex = trapSelectionRequired();
    expect(() => assertLotScope(ex, null)).toThrow(AsteLotScopeError);
  });

  it('scoped multi-lot H ok', async () => {
    const { trapMultiLotScopedH } = await import(
      '../../test/fixtures/aste/schema-v2-traps'
    );
    const ex = trapMultiLotScopedH();
    expect(() => assertLotScope(ex, 'H')).not.toThrow();
  });

  it('precedence trap prefers avviso', async () => {
    const { trapPrezzoPrecedence } = await import(
      '../../test/fixtures/aste/schema-v2-traps'
    );
    const ex = trapPrezzoPrecedence();
    applyPrezzoBasePrecedence(ex);
    expect(ex.economics.prezzo_base?.value).toBe(36000);
  });

  it('cauzione prezzo_offerto + L.G. + apartment+box fixtures shape', async () => {
    const {
      trapCauzionePrezzoOfferto,
      trapProceduraLg,
      trapApartmentPlusBox,
      trapLottoHNoteValore,
    } = await import('../../test/fixtures/aste/schema-v2-traps');
    expect(trapCauzionePrezzoOfferto().economics.cauzione?.base).toBe('prezzo_offerto');
    expect(trapProceduraLg().procedura.tipo).toBe('lg');
    expect(trapApartmentPlusBox().immobili).toHaveLength(2);
    expect(trapLottoHNoteValore().immobili[0]?.note_valore).toMatch(/senza attribuzione/);
  });
});
