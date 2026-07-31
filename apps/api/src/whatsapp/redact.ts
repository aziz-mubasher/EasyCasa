/**
 * EC-19 — best-effort pattern masking for inbound WhatsApp list previews.
 *
 * // EC-14 Pt 2: replace with the shared redaction service
 *
 * This is NOT a security control. Detail view + audit are the real control.
 * Pattern masking will miss things.
 */

const EMAIL_RE =
  /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+/g;

/** Italian IBAN (IT + 2 check + 23 alnum) and generic EU IBAN shapes. */
const IBAN_RE = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/gi;

/** Codice fiscale — 16 alphanumeric (letter-heavy Italian tax code). */
const CF_RE = /\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/gi;

/**
 * Phones: +39…, 0039…, and long digit runs that look like MSISDN.
 * Applied after email/IBAN/CF so we don't mangle those mid-match.
 */
const PHONE_RE =
  /(?:\+|00)\d{1,3}[\s./-]?(?:\d[\s./-]?){6,14}\d|\b0\d{1,4}[\s./-]?(?:\d[\s./-]?){5,10}\d\b/g;

export function redactPreview(text: string | null | undefined): string {
  if (text == null || text === '') return '';
  let out = text;
  out = out.replace(EMAIL_RE, '[email]');
  out = out.replace(IBAN_RE, '[iban]');
  out = out.replace(CF_RE, '[cf]');
  out = out.replace(PHONE_RE, '[phone]');
  return out;
}

/** Mask a Meta wa_id / MSISDN for list display — keep last 4 digits. */
export function maskWaId(waId: string): string {
  const digits = waId.replace(/\D/g, '');
  if (digits.length < 4) return '••••';
  return `••••${digits.slice(-4)}`;
}
