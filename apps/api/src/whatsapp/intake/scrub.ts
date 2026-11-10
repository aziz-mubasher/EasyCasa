const CODICE_FISCALE = /\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/gi;
const IBAN = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/gi;
/** Passport / identity-card shapes. Phone numbers are shorter or start with + and are left alone. */
const ID_DOC = /\b(?:[A-Z]{2}\d{7}|[A-Z]\d{8})\b/g;

function luhn(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = digits.charCodeAt(i) - 48;
    if (n < 0 || n > 9) return false;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function scrubCards(input: string): string {
  return input.replace(/\d[\d -]{11,22}\d/g, (raw) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return raw;
    return luhn(digits) ? '[removed]' : raw;
  });
}

/** Replace fiscal codes, IBANs, card numbers and ID-shaped tokens before a row exists. */
export function scrubAnswer(input: string, maxChars: number): string {
  const cleaned = scrubCards(
    input.replace(CODICE_FISCALE, '[removed]').replace(IBAN, '[removed]').replace(ID_DOC, '[removed]'),
  );
  return cleaned.length > maxChars ? cleaned.slice(0, maxChars) : cleaned;
}
