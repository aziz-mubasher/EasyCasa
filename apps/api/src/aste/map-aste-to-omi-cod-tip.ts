/**
 * EC-24 — map extraction tipologia / categoria_catastale → OMI Cod_Tip + AVM type.
 * Unknown → residential generic (20 / apartment) + caller adds warning.
 */

export type AsteOmiTipMapping = {
  codTip: number;
  propertyType: 'apartment' | 'villa' | 'commercial' | 'land' | 'room';
  usedGeneric: boolean;
  matchedOn: 'tipologia' | 'categoria_catastale' | 'generic';
  source: string | null;
};

function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

/** Pure mapper — unit-tested. */
export function mapAsteToOmiCodTip(input: {
  tipologia: string | null | undefined;
  categoria_catastale: string | null | undefined;
}): AsteOmiTipMapping {
  const tip = (input.tipologia ?? '').trim();
  const cat = (input.categoria_catastale ?? '').trim();

  if (tip) {
    const t = fold(tip);
    if (/vill|casa indip|unifam|bifam|terraced|detached/.test(t)) {
      return { codTip: 1, propertyType: 'villa', usedGeneric: false, matchedOn: 'tipologia', source: tip };
    }
    if (/negoz|commerc|uffic|capann|magazz|laboratorio|autorim|box|garage/.test(t)) {
      return {
        codTip: 5,
        propertyType: 'commercial',
        usedGeneric: false,
        matchedOn: 'tipologia',
        source: tip,
      };
    }
    if (/terren|agricol|edificabil|semin|pascol|bosco/.test(t)) {
      return { codTip: 14, propertyType: 'land', usedGeneric: false, matchedOn: 'tipologia', source: tip };
    }
    if (/appart|abitaz|attico|mansard|loft|monoloc|biloc|triloc/.test(t)) {
      return {
        codTip: 20,
        propertyType: 'apartment',
        usedGeneric: false,
        matchedOn: 'tipologia',
        source: tip,
      };
    }
  }

  if (cat) {
    const c = fold(cat).replace(/\s+/g, '');
    // A/7 ville e villini; A/8–A/9 atypical residential still apartment band
    if (/^a\/?7$/.test(c)) {
      return {
        codTip: 1,
        propertyType: 'villa',
        usedGeneric: false,
        matchedOn: 'categoria_catastale',
        source: cat,
      };
    }
    if (/^a\/?[1-6]|a\/?[89]|a\/?11/.test(c)) {
      return {
        codTip: 20,
        propertyType: 'apartment',
        usedGeneric: false,
        matchedOn: 'categoria_catastale',
        source: cat,
      };
    }
    if (/^c\/?1|^d\/?[1-8]|^c\/?3/.test(c)) {
      return {
        codTip: 5,
        propertyType: 'commercial',
        usedGeneric: false,
        matchedOn: 'categoria_catastale',
        source: cat,
      };
    }
    if (/^c\/?6|^c\/?7/.test(c)) {
      return {
        codTip: 5,
        propertyType: 'commercial',
        usedGeneric: false,
        matchedOn: 'categoria_catastale',
        source: cat,
      };
    }
  }

  return {
    codTip: 20,
    propertyType: 'apartment',
    usedGeneric: true,
    matchedOn: 'generic',
    source: tip || cat || null,
  };
}
