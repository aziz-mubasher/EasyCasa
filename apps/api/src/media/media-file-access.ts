/**
 * EC-S-T14.0 — classify `/media/file/*` keys for public vs private access.
 *
 * Listing masters (`media/{2hex}/{64hex}.webp` and legacy `listings/…`) stay
 * public. Private docs under `users/{id}/docs/…` require auth (owner or admin).
 * Unknown shapes soft-deny (not found) — no boot-time throw.
 */

/** Content-addressed listing master (EC-S-T10). */
const PUBLIC_MEDIA_MASTER =
  /^media\/[0-9a-f]{2}\/[0-9a-f]{64}\.webp$/i;

/** Legacy listing object keys still served publicly. */
const PUBLIC_LISTINGS_PREFIX = /^listings\//;

/** Private fascicolo / VO / checklist docs. */
const PRIVATE_USER_DOCS = /^users\/([^/]+)\/docs\//;

export function isPubliclyReadableMediaKey(key: string): boolean {
  return PUBLIC_MEDIA_MASTER.test(key) || PUBLIC_LISTINGS_PREFIX.test(key);
}

/** Returns the path user id when the key is a private doc; otherwise null. */
export function ownerUserIdFromPrivateDocKey(key: string): string | null {
  const m = PRIVATE_USER_DOCS.exec(key);
  return m?.[1] ?? null;
}

export type MediaFileAccessDecision =
  | { kind: 'public' }
  | { kind: 'private'; ownerUserId: string }
  | { kind: 'deny' };

export function classifyMediaFileKey(key: string): MediaFileAccessDecision {
  if (!key || key.includes('..') || key.startsWith('/') || key.includes('\\')) {
    return { kind: 'deny' };
  }
  if (isPubliclyReadableMediaKey(key)) return { kind: 'public' };
  const ownerUserId = ownerUserIdFromPrivateDocKey(key);
  if (ownerUserId) return { kind: 'private', ownerUserId };
  return { kind: 'deny' };
}
