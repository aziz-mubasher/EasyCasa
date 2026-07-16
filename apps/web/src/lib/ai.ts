// Client for the AI service (routed via Caddy at /ai/*). Mirrors lib/api.ts.
const AI_BASE =
  (typeof window === 'undefined' ? process.env.AI_URL : process.env.NEXT_PUBLIC_AI_URL) ??
  'http://localhost/ai';

export interface AiHit {
  id: string; slug: string | null; title: string;
  price: number | null; city: string | null;
  bedrooms: number | null; size_sqm: number | null; score: number | null;
}

export async function aiSearch(query: string, limit = 24): Promise<{ items: AiHit[] }> {
  const res = await fetch(`${AI_BASE}/search`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, limit }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`ai search failed: ${res.status}`);
  return res.json() as Promise<{ items: AiHit[] }>;
}

export async function aiAssistant(
  message: string,
  locale: string,
): Promise<{ answer: string; listings: AiHit[]; handoff: boolean }> {
  const res = await fetch(`${AI_BASE}/assistant`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message, locale }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`assistant failed: ${res.status}`);
  return res.json() as Promise<{ answer: string; listings: AiHit[]; handoff: boolean }>;
}
