import { describe, expect, it } from 'vitest';

import { isCompanyName, matchOwnerName, normalizeName } from '@easycasa/shared';

describe('normalizeName', () => {
  it('strips accents and apostrophes', () => {
    expect(normalizeName("Nicolò D'Angelo")).toEqual(['NICOLO', 'D', 'ANGELO']);
  });
});

describe('isCompanyName', () => {
  it('detects SRL/SPA with dots', () => {
    expect(isCompanyName('Acme S.R.L.')).toBe(true);
    expect(isCompanyName('Mario Rossi')).toBe(false);
  });
});

describe('matchOwnerName', () => {
  it('matches surname-first visura to given-name-first profile', () => {
    const r = matchOwnerName('Mario Rossi', ['ROSSI MARIO']);
    expect(r.verdict).toBe('match');
    expect(r.score).toBe(1);
  });

  it('ignores particles for scoring but requires substantive surnames', () => {
    expect(matchOwnerName('Marco Bianchi', ['DI MARCO']).verdict).not.toBe('match');
    expect(matchOwnerName('Marco Di Bianchi', ['BIANCHI MARCO']).verdict).toBe('match');
  });

  it('partial on meaningful overlap', () => {
    const r = matchOwnerName('Anna Maria Verdi', ['VERDI ANNA']);
    expect(r.verdict).toBe('partial');
    expect(r.score).toBeGreaterThanOrEqual(0.5);
  });

  it('company always advisory manual', () => {
    const r = matchOwnerName('Mario Rossi', ['Immobiliare Nord S.p.A.']);
    expect(r.verdict).toBe('company');
    expect(r.score).toBe(0);
  });

  it('picks best among multiple intestatari', () => {
    const r = matchOwnerName('Luca Bianchi', ['ROSSI MARIO', 'BIANCHI LUCA']);
    expect(r.verdict).toBe('match');
    expect(r.bestIntestatario).toBe('BIANCHI LUCA');
  });

  it('no_match when unrelated', () => {
    expect(matchOwnerName('Mario Rossi', ['VERDI GIULIA']).verdict).toBe('no_match');
  });
});
