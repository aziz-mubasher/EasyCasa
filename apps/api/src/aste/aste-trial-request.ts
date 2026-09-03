/** Request helpers for EC-TRIAL-1. Raw IP never leaves this file as a log field. */

import { hashClientIp } from './aste-ip-bucket';

export type AuthEmailVerified = {
  emailVerified?: boolean;
  email_verified?: boolean;
};

export function isAuthEmailVerified(user: AuthEmailVerified | null | undefined): boolean {
  if (!user) return false;
  return user.emailVerified === true || user.email_verified === true;
}

export function trialRequireVerifiedEmail(): boolean {
  const raw = (process.env.ASTE_TRIAL_REQUIRE_VERIFIED_EMAIL ?? '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function trialEnforcementEnabled(): boolean {
  const raw = (process.env.ASTE_TRIAL_ENFORCEMENT ?? '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function abuseIpSalt(): string {
  return (process.env.ASTE_ABUSE_IP_SALT ?? '').trim();
}

type HeaderBag = Record<string, string | string[] | undefined>;

/**
 * Read the client IP from the request, hash it, discard the raw value.
 * Returns null when no IP or no salt — never throws on a missing IP.
 */
export function hashRequestIp(
  req: { ip?: string; headers?: HeaderBag } | null | undefined,
  salt = abuseIpSalt(),
): { bucketHash: string | null } {
  if (!salt) return { bucketHash: null };
  const raw = pickClientIp(req);
  if (!raw) return { bucketHash: null };
  try {
    return { bucketHash: hashClientIp(raw, salt) };
  } catch {
    return { bucketHash: null };
  }
}

export function pickClientIp(req: { ip?: string; headers?: HeaderBag } | null | undefined): string | null {
  if (!req) return null;
  const forwarded = headerValue(req.headers, 'x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = headerValue(req.headers, 'x-real-ip');
  if (real) return real;
  return req.ip?.trim() || null;
}

function headerValue(headers: HeaderBag | undefined, name: string): string | null {
  if (!headers) return null;
  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
