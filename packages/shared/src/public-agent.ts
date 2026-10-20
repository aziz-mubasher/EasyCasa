/**
 * EC-APP-1-API-M1 — the only decision about which `agent` fields leave a
 * public response (listing UUID, listing slug, share link, smartlink).
 *
 * Phone is copied only from `contact.phone`. The caller has already applied
 * the REA gate. A fallback phone, a stored snapshot phone, and any email are
 * ignored. This function does not classify professionals.
 */

export interface PublicAgentInput {
  id?: string | null;
  displayName?: string | null;
  phone?: string | null;
  slug?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
}

/** Name and portrait may fall back. Phone and email on this object are never read. */
export interface PublicAgentFallback {
  id?: string | null;
  displayName?: string | null;
  bio?: string | null;
  slug?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface PublicAgentView {
  id: string | null;
  displayName: string | null;
  phone: string | null;
  slug: string | null;
  bio: string | null;
  avatarUrl: string | null;
}

function cleanSlug(slug: string | null | undefined): string | null {
  if (!slug || slug.startsWith('oidc:')) return null;
  return slug;
}

function cleanPhone(phone: string | null | undefined): string | null {
  const trimmed = phone?.trim();
  return trimmed ? trimmed : null;
}

export function agentForPublic(
  contact: PublicAgentInput | null | undefined,
  fallback?: PublicAgentFallback | null,
): PublicAgentView | null {
  if (!contact && !fallback) return null;
  const id = contact?.id ?? fallback?.id ?? null;
  const displayName = contact?.displayName ?? fallback?.displayName ?? null;
  const phone = cleanPhone(contact?.phone);
  const slug = cleanSlug(contact?.slug) ?? cleanSlug(fallback?.slug);
  const bio = contact?.bio ?? fallback?.bio ?? null;
  const avatarUrl = contact?.avatarUrl ?? fallback?.avatarUrl ?? null;
  if (
    id == null &&
    displayName == null &&
    phone == null &&
    slug == null &&
    bio == null &&
    avatarUrl == null
  ) {
    return null;
  }
  return { id, displayName, phone, slug, bio, avatarUrl };
}
