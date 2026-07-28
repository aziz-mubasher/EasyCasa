/**
 * Holder initials — mirror Banks4All `buildPublicPipClientInitials` (B4A-1).
 *
 * B4A source: Banks_4all/backend/src/utils/pipTracking.js
 *   first = trim(firstName); last = trim(lastName);
 *   return `${first[0].toUpperCase()}.${last[0].toUpperCase()}.`
 *
 * Particle rule (documented EC-3): the surname initial is the **first letter of
 * the full surname string** (`De Luca` → `D`), not the last token. EasyCasa only
 * has `displayName`, so we treat the first whitespace token as given name and
 * the **remainder** as the surname string (same as B4A when lastName holds the
 * full surname including particles).
 *
 * Comparison folds NFD + strips combining marks so diacritics do not cause
 * silent mismatches (`Nicolò` / `Martì`).
 */

/** Fold one character for comparison (NFD, strip marks, uppercase). */
export function foldInitialChar(ch: string): string {
  if (!ch) return '';
  return ch
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase();
}

/** Exact mirror of B4A when first/last are separate fields. */
export function buildHolderInitials(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string {
  const first = String(firstName ?? '').trim();
  const last = String(lastName ?? '').trim();
  const fi = first ? first.charAt(0).toUpperCase() : '';
  const li = last ? last.charAt(0).toUpperCase() : '';
  if (fi && li) return `${fi}.${li}.`;
  if (fi) return `${fi}.`;
  if (li) return `${li}.`;
  return '';
}

/**
 * Derive initials from a single display name to match B4A's two-field algorithm:
 * first token → firstName, remainder → lastName (full surname string).
 */
export function initialsFromDisplayName(name: string | null | undefined): string {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return '';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const firstName = parts[0]!;
    const lastName = parts.slice(1).join(' ');
    return buildHolderInitials(firstName, lastName);
  }
  return buildHolderInitials(parts[0], '');
}

/** Normalize an initials string for equality (letters only, diacritic-folded). */
export function normalizeInitials(s: string): string {
  return [...s]
    .map((ch) => foldInitialChar(ch))
    .join('')
    .replace(/[^A-Z]/g, '');
}

/** Compare attestation initials to an EasyCasa account display name. */
export function initialsMatch(
  attestation: string,
  displayName: string | null | undefined,
): boolean {
  const a = normalizeInitials(attestation);
  const b = normalizeInitials(initialsFromDisplayName(displayName));
  return a.length > 0 && a === b;
}
