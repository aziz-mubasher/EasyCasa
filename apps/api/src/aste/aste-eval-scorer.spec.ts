import { describe, expect, it } from 'vitest';

import {
  renderExtractionScoreTable,
  scoreCauzioneField,
  unwrapSourcedValue,
} from './aste-eval-scorer';

describe('unwrapSourcedValue', () => {
  it('unwraps nested { value, source }', () => {
    const s = unwrapSourcedValue({
      value: 52250.4,
      source: { file: 'doc-avviso', page: 1 },
    });
    expect(s).toEqual({
      hit: true,
      value: '52250.4',
      page: '1',
      notes: 'doc-avviso',
    });
  });

  it('unwraps nested { importo, source } without [object Object]', () => {
    const s = unwrapSourcedValue({
      importo: 36039,
      source: { file: 'avviso', page: 2 },
    });
    expect(s.hit).toBe(true);
    expect(s.value).toBe('36039');
    expect(s.page).toBe('2');
    expect(s.value).not.toContain('[object Object]');
  });

  it('marks derived importo with (derived)', () => {
    const s = unwrapSourcedValue({
      importo: 9000,
      derived: true,
      source: { file: 'avviso', page: 1 },
    });
    expect(s).toMatchObject({ hit: true, value: '9000 (derived)', page: '1' });
  });

  it('returns miss for null value with page ref preserved', () => {
    const s = unwrapSourcedValue({
      value: null,
      source: { file: 'perizia', page: 5 },
    });
    expect(s.hit).toBe(false);
    expect(s.value).toBe('');
    expect(s.page).toBe('5');
  });
});

describe('scoreCauzioneField', () => {
  it('renders pct-only cauzione', () => {
    const s = scoreCauzioneField({
      pct: 10,
      base: 'prezzo_base',
      importo: null,
      source: { file: 'avviso', page: 1 },
    });
    expect(s).toEqual({
      hit: true,
      value: '10%',
      page: '1',
      notes: 'avviso',
    });
  });

  it('renders importo / pct and derived importo', () => {
    const s = scoreCauzioneField({
      pct: 10,
      importo: 5225.04,
      derived: true,
      source: { file: 'avviso', page: 1 },
    });
    expect(s.value).toBe('5225.04 (derived) / 10%');
    expect(s.hit).toBe(true);
  });
});

describe('renderExtractionScoreTable', () => {
  it('never prints [object Object] for nested money fields', () => {
    const table = renderExtractionScoreTable({
      economics: {
        valore_stima: { value: 250000, source: { file: 'perizia', page: 2 } },
        prezzo_base: { importo: 36039, source: { file: 'avviso', page: 1 } },
        offerta_minima: { value: 27029, source: { file: 'avviso', page: 1 } },
        cauzione: { pct: 10, importo: 3603.9, source: { file: 'avviso', page: 1 } },
        rilancio_minimo: null,
      },
      procedura: { tipo: 'rge', numero: '1/2024', tribunale: 'Milano' },
      giuridica: { stato_occupazione: { stato: null, dettaglio: null } },
      urbanistica: {
        conformita_urbanistica: { stato: null, dettaglio: null },
        conformita_catastale: { stato: null, dettaglio: null },
        difformita: [],
      },
      meta: { not_found: ['economics.valore_stima'], lotti_trovati: [], warnings: [] },
    });
    const body = table.join('\n');
    expect(body).not.toContain('[object Object]');
    expect(body).toContain('economics.prezzo_base\thit\t36039\t1\tavviso');
    expect(body).toContain('economics.valore_stima\tmiss\t\t2\tperizia; not_found');
    expect(body).toContain('meta.not_found\t-\teconomics.valore_stima\t\t');
  });

  it('renders explicit not_found and extract_chunked warnings', () => {
    const table = renderExtractionScoreTable({
      economics: {
        valore_stima: null,
        prezzo_base: { value: 100355.25, source: { file: 'perizia', page: 3 } },
        offerta_minima: null,
        cauzione: { pct: 10, importo: null, source: { file: 'avviso', page: 1 } },
        rilancio_minimo: null,
      },
      procedura: { tipo: 'rge', numero: '10/2023', tribunale: 'Roma' },
      giuridica: { stato_occupazione: { stato: null, dettaglio: null } },
      urbanistica: {
        conformita_urbanistica: { stato: 'conforme', dettaglio: null },
        conformita_catastale: { stato: 'conforme', dettaglio: null },
        difformita: [],
      },
      meta: {
        not_found: ['giuridica.stato_occupazione', 'economics.valore_stima'],
        warnings: ['extract_chunked:7'],
        lotti_trovati: ['H'],
      },
    });
    const body = table.join('\n');
    expect(body).toContain('giuridica.stato_occupazione\tmiss');
    expect(body).toContain('meta.warnings\t-\textract_chunked:7');
    expect(body).toContain('meta.not_found\t-\tgiuridica.stato_occupazione,economics.valore_stima');
  });
});
