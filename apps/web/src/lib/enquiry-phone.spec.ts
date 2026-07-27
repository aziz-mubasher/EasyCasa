import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ENQUIRY_PHONE,
  enquiryPhoneForSubmit,
  hasUsableEnquiryPhone,
  isCountryCodeOnly,
  isPlausibleEnquiryPhone,
  normalizeEnquiryPhoneInput,
} from './enquiry-phone';

describe('enquiry-phone', () => {
  it('treats +39 alone as country-code only', () => {
    expect(isCountryCodeOnly('+39')).toBe(true);
    expect(isCountryCodeOnly('+39 ')).toBe(true);
    expect(isCountryCodeOnly('+39 333 1234567')).toBe(false);
    expect(enquiryPhoneForSubmit('+39 ')).toBeUndefined();
    expect(enquiryPhoneForSubmit('+39 333 1234567')).toBe('+39 333 1234567');
  });

  it('keeps +39 while typing a local Italian mobile', () => {
    expect(normalizeEnquiryPhoneInput('3331234567', DEFAULT_ENQUIRY_PHONE)).toBe('+39 3331234567');
    expect(normalizeEnquiryPhoneInput('+39 333', DEFAULT_ENQUIRY_PHONE)).toBe('+39 333');
    expect(normalizeEnquiryPhoneInput('', DEFAULT_ENQUIRY_PHONE)).toBe(DEFAULT_ENQUIRY_PHONE);
  });

  it('allows replacing with another country code', () => {
    expect(normalizeEnquiryPhoneInput('+34 612345678', DEFAULT_ENQUIRY_PHONE)).toBe('+34 612345678');
  });

  it('validates usable length for WhatsApp preference', () => {
    expect(hasUsableEnquiryPhone('+39 3331234567')).toBe(true);
    expect(hasUsableEnquiryPhone('+39 ')).toBe(false);
    expect(isPlausibleEnquiryPhone('+39 ')).toBe(true);
    expect(isPlausibleEnquiryPhone('12')).toBe(false);
  });
});
