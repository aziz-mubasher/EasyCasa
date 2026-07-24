import { createHash, createHmac, randomBytes } from 'node:crypto';

/** UTC calendar day for daily-rotating salt (GDPR: limits cross-day linkability). */
export function utcDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/**
 * One-way visitor fingerprint for SmartLink unique views (lifetime per link).
 * Never store raw IP, cookie, or User-Agent — only this hash.
 */
export function hashShareVisitor(input: {
  pepper: string;
  shareLinkId: string;
  visitorToken: string;
}): string {
  return createHmac('sha256', input.pepper)
    .update(`${input.shareLinkId}:${input.visitorToken}`)
    .digest('hex');
}

/** @deprecated daily salt helper — retained for tests / future retention bucketing */
export function hashShareVisitorDaily(input: {
  pepper: string;
  shareLinkId: string;
  visitorToken: string;
  day?: string;
}): string {
  const day = input.day ?? utcDayKey();
  const dailySalt = createHash('sha256').update(`${input.pepper}:${day}`).digest('hex').slice(0, 32);
  return createHmac('sha256', dailySalt)
    .update(`${input.shareLinkId}:${input.visitorToken}`)
    .digest('hex');
}

export function newVisitorToken(): string {
  return randomBytes(16).toString('base64url');
}

export function newShareToken(): string {
  return randomBytes(24).toString('base64url');
}
