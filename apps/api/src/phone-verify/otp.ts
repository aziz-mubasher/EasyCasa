import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

const OTP_DIGITS = 6;
const DEFAULT_TTL_MS = 10 * 60 * 1000;

export function generateOtpCode(digits = OTP_DIGITS): string {
  const max = 10 ** digits;
  const n = randomInt(0, max);
  return String(n).padStart(digits, '0');
}

export function hashOtp(code: string, pepper: string): string {
  return createHash('sha256').update(`${pepper}:${code}`).digest('hex');
}

export function otpMatches(code: string, pepper: string, codeHash: string): boolean {
  const a = Buffer.from(hashOtp(code, pepper), 'hex');
  const b = Buffer.from(codeHash, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function otpExpiresAt(now = new Date(), ttlMs = DEFAULT_TTL_MS): Date {
  return new Date(now.getTime() + ttlMs);
}

/** Normalize to E.164-ish: leading +, digits only after. */
export function normalizePhoneE164(raw: string): string | null {
  const trimmed = raw.trim().replace(/[\s()-]/g, '');
  if (!trimmed) return null;
  let s = trimmed;
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  if (!s.startsWith('+')) {
    // Italy default for national mobiles starting with 3
    if (/^3\d{8,9}$/.test(s)) s = `+39${s}`;
    else return null;
  }
  if (!/^\+[1-9]\d{7,14}$/.test(s)) return null;
  return s;
}
