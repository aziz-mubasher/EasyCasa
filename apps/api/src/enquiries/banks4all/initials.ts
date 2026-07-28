/**
 * Derive holder initials in the Banks4All format: "M.R." or "M." from a display name.
 */
export function initialsFromDisplayName(name: string | null | undefined): string {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0]!.charAt(0).toUpperCase();
    const last = parts[parts.length - 1]!.charAt(0).toUpperCase();
    return `${first}.${last}.`;
  }
  if (parts.length === 1 && parts[0]!.length > 0) {
    return `${parts[0]!.charAt(0).toUpperCase()}.`;
  }
  return '';
}

function normalizeInitials(s: string): string {
  return s.replace(/[^A-Za-z]/g, '').toUpperCase();
}

/** Compare attestation initials to an EasyCasa account display name. */
export function initialsMatch(attestation: string, displayName: string | null | undefined): boolean {
  const a = normalizeInitials(attestation);
  const b = normalizeInitials(initialsFromDisplayName(displayName));
  return a.length > 0 && a === b;
}
