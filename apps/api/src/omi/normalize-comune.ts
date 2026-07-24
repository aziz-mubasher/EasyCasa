/** Normalize comune names for OMI ↔ listing lookup (case, apostrophes, accents). */
export function normalizeOmiComune(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[`']/g, "'")
    .replace(/\s+/g, ' ');
}
