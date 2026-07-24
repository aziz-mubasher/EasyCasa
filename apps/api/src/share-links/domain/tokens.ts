import { createHash, randomBytes } from 'node:crypto';

/** Unguessable URL token (URL-safe, not sequential). */
export function generateShareToken(): string {
  return randomBytes(24).toString('base64url');
}

export function utcViewDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** One-way daily visitor bucket — no IP, no raw client id persisted. */
export function visitorHashForView(
  secret: string,
  shareLinkId: string,
  viewDate: string,
  opaqueVisitorId: string,
): string {
  const inner = createHash('sha256').update(opaqueVisitorId, 'utf8').digest('hex');
  return createHash('sha256')
    .update(`${secret}:${shareLinkId}:${viewDate}:${inner}`, 'utf8')
    .digest('hex');
}

export function normalizeOpaqueVisitorId(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.length < 8 || trimmed.length > 128) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) return null;
  return trimmed;
}
