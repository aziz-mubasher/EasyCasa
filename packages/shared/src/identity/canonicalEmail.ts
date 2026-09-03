/** Canonical form used for the once-per-person free-file check. */

const GOOGLE = new Set(['gmail.com', 'googlemail.com']);

/**
 * Canonical form used for the once-per-person check.
 * Never shown to a user, never used to send mail, never used to log in —
 * the raw address stays the address of record.
 */
export function canonicalEmail(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  const at = trimmed.lastIndexOf('@');
  if (at < 1 || at === trimmed.length - 1) {
    throw new Error('invalid email');
  }

  let local = trimmed.slice(0, at);
  let domain = trimmed.slice(at + 1);

  const plus = local.indexOf('+');
  if (plus > 0) local = local.slice(0, plus);

  // Dots are only insignificant at Google. Stripping them anywhere else
  // merges two different people.
  if (GOOGLE.has(domain)) {
    local = local.replace(/\./g, '');
    domain = 'gmail.com';
  }

  return `${local}@${domain}`;
}

export function tryCanonicalEmail(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  try {
    return canonicalEmail(raw);
  } catch {
    return null;
  }
}
