import type { PropertyType } from '../avm/domain/types';

/**
 * Map OMI Cod_Tip / Descr_Tipologia to AVM property types.
 * Multiple OMI tipologie collapse to one band type; import keeps cod_tip for disambiguation.
 */
export function propertyTypeFromOmiCodTip(codTip: number, descrTipologia: string): PropertyType | null {
  if (codTip === 1) return 'villa';
  if (codTip === 20 || codTip === 21) return 'apartment';
  if (codTip === 5 || codTip === 6 || codTip === 8) return 'commercial';
  if (codTip === 16 || codTip === 14 || codTip === 15) return 'commercial';
  const d = descrTipologia.trim().toLowerCase();
  if (d.includes('ville') || d.includes('villini')) return 'villa';
  if (d.includes('abitaz') || d.includes('appart')) return 'apartment';
  if (d.includes('negoz') || d.includes('uffic') || d.includes('capann') || d.includes('autorim')) {
    return 'commercial';
  }
  if (d.includes('terren') || d.includes('semin') || d.includes('pascol') || d.includes('bosco')) {
    return 'land';
  }
  if (d.includes('camera') || d.includes('alloggio')) return 'room';
  return null;
}

/** OMI stato conservativo / commercial position codes we persist on import. */
export function normalizeOmiStato(raw: string, codTip: number): string {
  const s = raw.trim().toUpperCase();
  if (!s) return '';
  if (codTip === 5 && (s === 'O' || s === 'N' || s === 'S')) return s;
  return s;
}
