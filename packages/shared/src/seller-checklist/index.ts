/**
 * EC-S-T18 — private-seller document checklist (P6).
 * Reuses fascicolo type_code vocabulary only — no fascicolo domain imports.
 */

export const SELLER_CHECKLIST_TYPE_CODES = [
  'APE',
  'ATTO_PROVENIENZA',
  'VISURA_CATASTALE',
  'PLANIMETRIA_CATASTALE',
] as const;

export type SellerChecklistTypeCode = (typeof SELLER_CHECKLIST_TYPE_CODES)[number];

export type SellerChecklistItem = {
  typeCode: SellerChecklistTypeCode;
  docKey: string | null;
  addedAt: string | null;
};

export type SellerDocScore = { have: number; total: number };

export function isSellerChecklistTypeCode(v: unknown): v is SellerChecklistTypeCode {
  return (
    typeof v === 'string' &&
    (SELLER_CHECKLIST_TYPE_CODES as readonly string[]).includes(v)
  );
}

export function emptyChecklistItems(): SellerChecklistItem[] {
  return SELLER_CHECKLIST_TYPE_CODES.map((typeCode) => ({
    typeCode,
    docKey: null,
    addedAt: null,
  }));
}

export function scoreChecklist(items: readonly SellerChecklistItem[]): SellerDocScore {
  const total = SELLER_CHECKLIST_TYPE_CODES.length;
  const have = items.filter((i) => Boolean(i.docKey)).length;
  return { have, total };
}

/** Public surface — score only, never keys/names. */
export function completenessPercent(score: SellerDocScore): number {
  if (score.total <= 0) return 0;
  return Math.round((score.have / score.total) * 100);
}
