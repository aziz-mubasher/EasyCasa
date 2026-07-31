/**
 * EC-19b — normalise user-entered phone to Meta-style wa_id digits
 * (E.164 without '+'). Default country code Italy (39).
 *
 * Italian landlines retain the trunk zero in international form
 * (`02…` → `3902…`). Do not strip leading zeros after the country code.
 * Do not suffix-match or fuzzy-match.
 */
export function toWaId(
  input: string | null | undefined,
  defaultCc = '39',
): string | null {
  if (input == null) return null;
  // Strip spaces, hyphens, parentheses, dots, NBSP, and other non-digits except leading + / 00 handled below.
  let s = input
    .replace(/[\s\u00a0\-().]/g, '')
    .trim();
  if (!s) return null;

  if (s.startsWith('+')) {
    s = s.slice(1);
  } else if (s.startsWith('00')) {
    s = s.slice(2);
  } else {
    s = `${defaultCc}${s}`;
  }

  // Digits only after prefix handling (guards leftover punctuation).
  s = s.replace(/\D/g, '');
  if (!/^\d{8,15}$/.test(s)) return null;
  return s;
}
