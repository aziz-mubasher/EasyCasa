/**
 * Enquiry phone helpers — keep Italian WhatsApp numbers unambiguous with +39.
 */

const IT_COUNTRY_PREFIX = '+39';

/** Default enquiry phone field value (visible country code for WhatsApp). */
export const DEFAULT_ENQUIRY_PHONE = `${IT_COUNTRY_PREFIX} `;

export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** True when the field only has a short country code (e.g. "+39 ") and no local number. */
export function isCountryCodeOnly(value: string): boolean {
  const digits = phoneDigits(value);
  return digits.length > 0 && digits.length <= 3;
}

export function hasUsableEnquiryPhone(value: string): boolean {
  return phoneDigits(value).length >= 8;
}

export function isPlausibleEnquiryPhone(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  // Incomplete country-code entry while typing (e.g. "+39 ").
  if (trimmed.startsWith('+') && isCountryCodeOnly(trimmed)) return true;
  if (!/^[\d\s+().-]{6,40}$/.test(trimmed)) return false;
  return hasUsableEnquiryPhone(trimmed);
}

/**
 * Keep "+39 " visible while editing Italian numbers.
 * Allows other country codes if the user replaces the prefix (starts with + and not +39…).
 */
export function normalizeEnquiryPhoneInput(next: string, prev: string): string {
  if (!next.trim()) return DEFAULT_ENQUIRY_PHONE;

  // User clearing back into the Italian prefix — restore spaced +39.
  if (next === '+' || next === '+3' || next === '+39') {
    return DEFAULT_ENQUIRY_PHONE;
  }

  // If previous was Italian default and next lost the +39 prefix without choosing another +, put it back.
  const prevItalian = phoneDigits(prev).startsWith('39') || prev.trimStart().startsWith(IT_COUNTRY_PREFIX);
  const nextHasPlus = next.trimStart().startsWith('+');
  if (prevItalian && !nextHasPlus && /^\d/.test(next.trimStart())) {
    return `${IT_COUNTRY_PREFIX} ${next.trimStart()}`;
  }

  return next;
}

/** Value to submit — empty when only a country code remains. */
export function enquiryPhoneForSubmit(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed || isCountryCodeOnly(trimmed)) return undefined;
  return trimmed;
}
