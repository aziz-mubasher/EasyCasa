import { PROVINCE_BY_SLUG } from '@easycasa/shared';

/**
 * Show the full Italian province name when the stored value is a sigla (e.g. "BS" → "Brescia").
 * If the value is already a name (or unknown), return it unchanged.
 */
export function formatProvinceName(province: string | null | undefined): string | null {
  if (!province) return null;
  const trimmed = province.trim();
  if (!trimmed) return null;
  const bySigla = PROVINCE_BY_SLUG.get(trimmed.toUpperCase());
  if (bySigla) return bySigla.name;
  return trimmed;
}
