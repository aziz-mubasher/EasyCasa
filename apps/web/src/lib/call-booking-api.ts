export type CallRequestPayload = {
  fullName: string;
  email: string;
  phone: string;
  province: string;
  reason: string;
  preferredAt?: string | null;
  locale: 'it' | 'en' | 'es';
  consent: true;
};

export type CallRequestResponse = { ok: true; dueAt: string };

const BASE =
  (typeof window === 'undefined' ? process.env.API_URL : process.env.NEXT_PUBLIC_API_URL) ??
  'http://localhost/api';

export async function submitCallRequest(body: CallRequestPayload): Promise<CallRequestResponse> {
  const res = await fetch(`${BASE}/call-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `call request failed: ${res.status}`);
  }
  return (await res.json()) as CallRequestResponse;
}
