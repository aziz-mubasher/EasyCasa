/**
 * Full ISTAT comune list for Region → Province → Comune search cascade.
 * Compact JSON: { name, provinceCode (sigla), istat }.
 */
import comuniJson from './comuni.json';

import { ITALIAN_PROVINCES, type ProvinceInfo } from '../italian-geography';

export interface ItalyComune {
  name: string;
  provinceCode: string;
  istat: string;
}

export const ITALY_COMUNI: readonly ItalyComune[] = comuniJson as ItalyComune[];

const comuniByProvince = new Map<string, ItalyComune[]>();
for (const c of ITALY_COMUNI) {
  const code = c.provinceCode.toUpperCase();
  const list = comuniByProvince.get(code) ?? [];
  list.push(c);
  comuniByProvince.set(code, list);
}
for (const list of comuniByProvince.values()) {
  list.sort((a, b) => a.name.localeCompare(b.name, 'it'));
}

export function comuniForProvince(provinceCode: string): ItalyComune[] {
  return comuniByProvince.get(provinceCode.trim().toUpperCase()) ?? [];
}

export function provincesForRegion(regionSlug: string): ProvinceInfo[] {
  return ITALIAN_PROVINCES.filter((p) => p.regionSlug === regionSlug).map((p) => ({ ...p }));
}
