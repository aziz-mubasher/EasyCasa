/**
 * Enquiry phone helpers — dial-code + national number for WhatsApp-safe E.164-ish values.
 */

import {
  DEFAULT_DIAL_CODE,
  ENQUIRY_DIAL_CODES,
  isKnownDialCode,
} from './enquiry-dial-codes';

export { DEFAULT_DIAL_CODE };

/** @deprecated Prefer composeEnquiryPhone(DEFAULT_DIAL_CODE, '') */
export const DEFAULT_ENQUIRY_PHONE = `${DEFAULT_DIAL_CODE} `;

const DIAL_CODES_LONGEST_FIRST = [...ENQUIRY_DIAL_CODES.map((d) => d.code)].sort(
  (a, b) => b.length - a.length,
);

export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function composeEnquiryPhone(dialCode: string, national: string): string {
  const code = dialCode.trim() || DEFAULT_DIAL_CODE;
  const local = national.replace(/[^\d\s().-]/g, '').trim();
  if (!local) return `${code} `;
  return `${code} ${local}`;
}

export function nationalDigitsOnly(national: string): string {
  return phoneDigits(national);
}

/** True when only a country calling code is present (no national number). */
export function isCountryCodeOnly(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed.startsWith('+')) return false;
  const digits = phoneDigits(trimmed);
  // Calling codes are 1–3 digits; treat as "code only" when nothing beyond that.
  return digits.length > 0 && digits.length <= 3;
}

/** National number long enough to be a real mobile/landline fragment. */
export function hasUsableNationalNumber(national: string): boolean {
  return nationalDigitsOnly(national).length >= 6;
}

export function hasUsableEnquiryPhone(value: string): boolean {
  return phoneDigits(value).length >= 8;
}

export function isPlausibleEnquiryPhone(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('+') && isCountryCodeOnly(trimmed)) return true;
  if (!/^[\d\s+().-]{6,40}$/.test(trimmed)) return false;
  return hasUsableEnquiryPhone(trimmed);
}

/** Value to submit — empty when only a country code remains. */
export function enquiryPhoneForSubmit(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed || isCountryCodeOnly(trimmed)) return undefined;
  return trimmed;
}

/**
 * Split a stored/full phone into dial code + national part.
 * Falls back to Italy (+39) when the prefix is unknown.
 */
export function splitEnquiryPhone(value: string): { dialCode: string; national: string } {
  const trimmed = value.trim();
  if (!trimmed) return { dialCode: DEFAULT_DIAL_CODE, national: '' };

  for (const code of DIAL_CODES_LONGEST_FIRST) {
    if (trimmed === code || trimmed.startsWith(`${code} `) || trimmed.startsWith(code)) {
      const rest = trimmed.slice(code.length).replace(/^\s+/, '');
      return { dialCode: code, national: rest };
    }
  }

  if (trimmed.startsWith('+')) {
    const m = trimmed.match(/^(\+\d{1,3})\s*(.*)$/);
    if (m) {
      const code = m[1] ?? DEFAULT_DIAL_CODE;
      return {
        dialCode: isKnownDialCode(code) ? code : DEFAULT_DIAL_CODE,
        national: (m[2] ?? '').trim(),
      };
    }
  }

  return { dialCode: DEFAULT_DIAL_CODE, national: trimmed };
}
