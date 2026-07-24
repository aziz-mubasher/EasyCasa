import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { inferSemesterFromFilename, parseOmiValoriCsv } from './parse-valori-csv';

const FIXTURE = `Area_territoriale,Regione,Prov,Comune_ISTAT,Comune_cat,Sez,Comune_amm,Comune_descrizione,Fascia,Zona,LinkZona,Cod_Tip,Descr_Tipologia,Stato,Stato_prev,Compr_min,Compr_max,Sup_NL_compr,Loc_min,Loc_max,Sup_NL_loc
NORD-OVEST,LOMBARDIA,MI,3015002,C1AC,,A010,ABBIATEGRASSO,B,B1,MI00004564,20,Abitazioni civili,OTTIMO,P,2000,2250*,L,7,7.8,L
SUD,CAMPANIA,AV,15064002,Q2AC,,A228,ALTAVILLA IRPINA,B,B1,AV00000044,5,Negozi,O,P,1000*,1300,L,4.7,6.2,L
NORD-OVEST,LOMBARDIA,BS,3017166,C3KG,,H598,ROVATO,D,D1,BS00003091,14,Posti auto coperti,NORMALE,P,410,495,L,1.3,1.6,N
`;

describe('parseOmiValoriCsv', () => {
  it('parses compravendita rows with rectification asterisk and Negozi O/N/S stato', () => {
    const { rows, skipped } = parseOmiValoriCsv(FIXTURE);
    expect(skipped).toEqual([]);
    expect(rows).toHaveLength(3);

    const abbi = rows.find((r) => r.comune === 'ABBIATEGRASSO');
    expect(abbi).toMatchObject({
      provincia: 'MI',
      propertyType: 'apartment',
      minPerM2Cents: 200_000,
      maxPerM2Cents: 225_000,
      rectified: true,
      stato: 'OTTIMO',
    });

    const negozi = rows.find((r) => r.comune === 'ALTAVILLA IRPINA');
    expect(negozi).toMatchObject({
      codTip: 5,
      stato: 'O',
      minPerM2Cents: 100_000,
      rectified: true,
    });

    const box = rows.find((r) => r.comune === 'ROVATO');
    expect(box?.propertyType).toBe('commercial');
    expect(box?.stato).toBe('NORMALE');
  });

  it('skips banner lines before the header row', () => {
    const withBanner = `Quotazioni OMI semestre 2025\n${FIXTURE}`;
    const { rows, headerLine } = parseOmiValoriCsv(withBanner);
    expect(rows).toHaveLength(3);
    expect(headerLine).toBe(2);
  });

  it('infers semester token from AE filename', () => {
    expect(inferSemesterFromFilename('QI_294583_1_20162_VALORI_utf8.csv')).toBe('2016-H2');
  });
});

describe('fixture file', () => {
  it('loads committed sample rows', () => {
    const text = readFileSync(join(__dirname, 'fixtures', 'valori-sample.csv'), 'utf8');
    const { rows } = parseOmiValoriCsv(text);
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });
});
