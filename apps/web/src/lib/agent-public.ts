const BASE =
  (typeof window === 'undefined' ? process.env.API_URL : process.env.NEXT_PUBLIC_API_URL) ??
  'http://localhost/api';

/** Public-safe agent fields for SmartLink (never expose user id, email, or OIDC slug). */
export interface PublicAgentProfile {
  displayName: string | null;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
}

function isPublicAgentSlug(slug: string | null | undefined): slug is string {
  if (!slug) return false;
  if (slug.startsWith('oidc:')) return false;
  return true;
}

/** Load agent portrait/contact extras from GET /agents/:slug; returns null when unavailable. */
export async function fetchPublicAgentBySlug(slug: string | null | undefined): Promise<PublicAgentProfile | null> {
  if (!isPublicAgentSlug(slug)) return null;
  const res = await fetch(`${BASE}/agents/${encodeURIComponent(slug)}`, {
    next: { revalidate: 300 },
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const raw = (await res.json()) as Record<string, unknown>;
  return {
    displayName: typeof raw.displayName === 'string' ? raw.displayName : null,
    phone: typeof raw.phone === 'string' ? raw.phone : null,
    bio: typeof raw.bio === 'string' ? raw.bio : null,
    avatarUrl: typeof raw.avatarUrl === 'string' ? raw.avatarUrl : null,
  };
}

export function whatsAppHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : null;
}

export function telHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  return `tel:${phone.replace(/\s/g, '')}`;
}
