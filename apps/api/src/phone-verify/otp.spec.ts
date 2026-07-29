import { describe, expect, it } from 'vitest';

import {
  generateOtpCode,
  hashOtp,
  normalizePhoneE164,
  otpMatches,
} from './otp';

describe('phone OTP helpers (EC-12)', () => {
  it('generates 6-digit codes', () => {
    const c = generateOtpCode();
    expect(c).toMatch(/^\d{6}$/);
  });

  it('hashes and verifies with pepper', () => {
    const hash = hashOtp('123456', 'pepper');
    expect(otpMatches('123456', 'pepper', hash)).toBe(true);
    expect(otpMatches('000000', 'pepper', hash)).toBe(false);
    expect(otpMatches('123456', 'other', hash)).toBe(false);
  });

  it('normalizes IT mobiles', () => {
    expect(normalizePhoneE164('3331234567')).toBe('+393331234567');
    expect(normalizePhoneE164('+39 333 123 4567')).toBe('+393331234567');
    expect(normalizePhoneE164('00393331234567')).toBe('+393331234567');
    expect(normalizePhoneE164('abc')).toBeNull();
  });
});
