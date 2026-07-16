// Billing/messaging client. Mirrors lib/api.ts (server vs browser base URL).
const BASE =
  (typeof window === 'undefined' ? process.env.API_URL : process.env.NEXT_PUBLIC_API_URL) ??
  'http://localhost/api';

async function authedPost(path: string, token: string, body: unknown): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

export async function startCheckout(token: string, planKey: string): Promise<string> {
  const res = await authedPost('/billing/checkout', token, { planKey });
  if (!res.ok) throw new Error(`checkout failed: ${res.status}`);
  return ((await res.json()) as { url: string }).url;
}

export async function openPortal(token: string): Promise<string> {
  const res = await authedPost('/billing/portal', token, {});
  if (!res.ok) throw new Error(`portal failed: ${res.status}`);
  return ((await res.json()) as { url: string }).url;
}

export async function featureListing(token: string, listingId: string, days: number): Promise<string> {
  const res = await authedPost('/featured/checkout', token, { listingId, days });
  if (!res.ok) throw new Error(`feature failed: ${res.status}`);
  return ((await res.json()) as { url: string }).url;
}

export async function startConversation(token: string, listingId: string, message: string): Promise<unknown> {
  const res = await authedPost('/conversations', token, { listingId, message });
  if (!res.ok) throw new Error(`message failed: ${res.status}`);
  return res.json();
}
