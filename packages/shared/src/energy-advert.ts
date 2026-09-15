/**
 * D.lgs. 192/2005 art. 6 c. 8 + art. 15 — energy class and index must appear
 * on every property advert. Fine 500–3.000 € per advert.
 *
 * [[BUCO: elenco cause di esenzione APE]] — no exemption enum yet; never treat
 * a missing class/index as null-meaning-exempt. Counsel must supply the list.
 */

export const ENERGY_ADVERT_CLASS_SLUGS = [
  'A4',
  'A3',
  'A2',
  'A1',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
] as const;

export type EnergyAdvertClass = (typeof ENERGY_ADVERT_CLASS_SLUGS)[number];

export const ENERGY_ADVERT_SANCTION_EUR = '500–3.000';

export const ENERGY_ADVERT_LEGAL_CITE =
  'art. 6 c. 8 e art. 15 D.lgs. 192/2005';

export class EnergyAdvertError extends Error {
  readonly code = 'ENERGY_ADVERT_INCOMPLETE';

  constructor(message: string) {
    super(message);
    this.name = 'EnergyAdvertError';
  }
}

export function normalizeEnergyClass(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim().toUpperCase();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseEnergyIndexKwh(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function energyAdvertComplete(input: {
  energyClass?: string | null;
  energyPerformanceKwhM2Y?: number | string | null;
}): boolean {
  const klass = normalizeEnergyClass(input.energyClass);
  const ipe = parseEnergyIndexKwh(input.energyPerformanceKwhM2Y);
  if (!klass) return false;
  if (!(ENERGY_ADVERT_CLASS_SLUGS as readonly string[]).includes(klass)) return false;
  return ipe != null;
}

export function energyAdvertRejectMessage(locale: 'it' | 'en' | 'es' = 'it'): string {
  if (locale === 'en') {
    return `Cannot publish without energy class and index (kWh/m²·year). ${ENERGY_ADVERT_LEGAL_CITE}: fine ${ENERGY_ADVERT_SANCTION_EUR} € per advert. [[BUCO: elenco cause di esenzione APE]]`;
  }
  if (locale === 'es') {
    return `No se puede publicar sin clase energética e índice (kWh/m²·año). ${ENERGY_ADVERT_LEGAL_CITE}: sanción ${ENERGY_ADVERT_SANCTION_EUR} € por anuncio. [[BUCO: elenco cause di esenzione APE]]`;
  }
  return `Non si pubblica senza classe energetica e indice (kWh/m²·anno). ${ENERGY_ADVERT_LEGAL_CITE}: sanzione ${ENERGY_ADVERT_SANCTION_EUR} € per annuncio. [[BUCO: elenco cause di esenzione APE]]`;
}

export function assertEnergyAdvertComplete(input: {
  energyClass?: string | null;
  energyPerformanceKwhM2Y?: number | string | null;
}): void {
  if (!energyAdvertComplete(input)) {
    throw new EnergyAdvertError(energyAdvertRejectMessage('it'));
  }
}
