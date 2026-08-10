/** Client helper for EC-21 Aste lead magnet API. */

const BASE =
  (typeof window === 'undefined' ? process.env.API_URL : process.env.NEXT_PUBLIC_API_URL) ??
  'http://localhost/api';

export type AsteLeadPayload = {
  email: string;
  language: 'it' | 'en' | 'es';
  locale: 'it' | 'en' | 'es';
  consent: true;
  province?: string | null;
  buyerType?: 'prima_casa' | 'investimento' | 'curiosita' | null;
};

export type AsteLeadResponse = {
  ok: true;
  guideUrl: string;
  language: string;
  duplicate: boolean;
};

export async function submitAsteLead(body: AsteLeadPayload): Promise<AsteLeadResponse> {
  const res = await fetch(`${BASE}/aste/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `aste lead failed: ${res.status}`);
  }
  return (await res.json()) as AsteLeadResponse;
}
