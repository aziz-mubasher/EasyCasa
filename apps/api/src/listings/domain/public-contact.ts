/**
 * EC-APP-1-API-M1 — who may show a phone on a public listing.
 *
 * The reliable classifier in this repo is a verified, unexpired
 * `credentials.type = REA_MEDIATORE` row joined through `professionals.user_id`.
 * Keycloak role, `sellerType`, and "the field is named agent" are not that.
 * Anyone else publishes with `phone: null`. Email is never part of this projection.
 */

export const PUBLIC_PHONE_CREDENTIAL = 'REA_MEDIATORE';

export interface StoredCredential {
  type: string;
  status: string;
  expiresAt: Date | null;
}

export interface PublicAgentContact {
  id: string;
  displayName: string | null;
  /** Null unless `credentialAllowsPublicPhone` is true. */
  phone: string | null;
  /** Public slug. OIDC slugs are omitted. */
  slug: string | null;
  bio: string | null;
  avatarUrl: string | null;
}

export function credentialAllowsPublicPhone(
  credentials: readonly StoredCredential[],
  now: Date,
): boolean {
  return credentials.some((c) => {
    if (c.type !== PUBLIC_PHONE_CREDENTIAL) return false;
    if (c.status.toLowerCase() !== 'verified') return false;
    if (c.expiresAt != null && c.expiresAt.getTime() < now.getTime()) return false;
    return true;
  });
}

/** Phone string for a public payload, or null. Never returns an email. */
export function publicPhone(
  phone: string | null | undefined,
  allowed: boolean,
): string | null {
  if (!allowed) return null;
  const trimmed = phone?.trim();
  return trimmed ? trimmed : null;
}

export function publicSlug(slug: string | null | undefined): string | null {
  if (!slug || slug.startsWith('oidc:')) return null;
  return slug;
}

export {
  agentForPublic,
  type PublicAgentFallback,
  type PublicAgentInput,
  type PublicAgentView,
} from '@easycasa/shared';
