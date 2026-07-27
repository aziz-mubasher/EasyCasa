import { describe, expect, it } from 'vitest';

import { DEFAULT_DIAL_CODE, ENQUIRY_DIAL_CODES } from './enquiry-dial-codes';
import {
  composeEnquiryPhone,
  enquiryPhoneForSubmit,
  hasUsableEnquiryPhone,
  hasUsableNationalNumber,
  isCountryCodeOnly,
  isPlausibleEnquiryPhone,
  splitEnquiryPhone,
} from './enquiry-phone';

describe('enquiry dial codes', () => {
  it('lists Italy (+39) first', () => {
    expect(ENQUIRY_DIAL_CODES[0]?.code).toBe('+39');
    expect(DEFAULT_DIAL_CODE).toBe('+39');
  });
});

describe('enquiry-phone', () => {
  it('composes dial code + national number', () => {
    expect(composeEnquiryPhone('+39', '333 1234567')).toBe('+39 333 1234567');
    expect(composeEnquiryPhone('+34', '')).toBe('+34 ');
  });

  it('treats code-only as empty for submit', () => {
    expect(isCountryCodeOnly('+39')).toBe(true);
    expect(isCountryCodeOnly('+39 ')).toBe(true);
    expect(isCountryCodeOnly('+39 333 1234567')).toBe(false);
    expect(enquiryPhoneForSubmit('+39 ')).toBeUndefined();
    expect(enquiryPhoneForSubmit('+39 333 1234567')).toBe('+39 333 1234567');
  });

  it('splits known prefixes with longest match', () => {
    expect(splitEnquiryPhone('+351 912345678')).toEqual({
      dialCode: '+351',
      national: '912345678',
    });
    expect(splitEnquiryPhone('+39 3331234567')).toEqual({
      dialCode: '+39',
      national: '3331234567',
    });
  });

  it('validates usable national numbers for WhatsApp', () => {
    expect(hasUsableNationalNumber('333123')).toBe(true);
    expect(hasUsableNationalNumber('333')).toBe(false);
    expect(hasUsableEnquiryPhone('+39 3331234567')).toBe(true);
    expect(hasUsableEnquiryPhone('+39 ')).toBe(false);
    expect(isPlausibleEnquiryPhone('+39 ')).toBe(true);
    expect(isPlausibleEnquiryPhone('12')).toBe(false);
  });
});
