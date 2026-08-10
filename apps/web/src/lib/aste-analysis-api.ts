/** Client helpers for EC-22 aste analysis API (flag-gated on server). */

import { createAuthedFetch, apiUrl } from '@/auth/authedFetch';

export type AsteAnalysis = {
  id: string;
  status: string;
  language: string;
  register: string;
  documents?: AsteDocument[];
  createdAt: string;
  updatedAt: string;
};

export type AsteDocument = {
  id: string;
  originalFilename: string;
  docType: string;
  mime: string;
  sizeBytes: number;
  createdAt: string;
};

export type DocType = 'perizia' | 'avviso' | 'ordinanza' | 'planimetria' | 'altro';

type TokenGetter = () => Promise<string | null>;

function client(getAccessToken: TokenGetter) {
  return createAuthedFetch(getAccessToken);
}

export async function createAnalysis(
  getAccessToken: TokenGetter,
  input: { language: 'it' | 'en' | 'es'; register: 'investor' | 'first_buyer' },
): Promise<AsteAnalysis> {
  const fetchAuth = client(getAccessToken);
  const res = await fetchAuth(apiUrl('/aste/analyses'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`create failed: ${res.status}`);
  return (await res.json()) as AsteAnalysis;
}

export async function getAnalysis(
  getAccessToken: TokenGetter,
  id: string,
): Promise<AsteAnalysis> {
  const fetchAuth = client(getAccessToken);
  const res = await fetchAuth(apiUrl(`/aste/analyses/${id}`), { cache: 'no-store' });
  if (!res.ok) throw new Error(`get failed: ${res.status}`);
  return (await res.json()) as AsteAnalysis;
}

export async function listAnalyses(getAccessToken: TokenGetter): Promise<AsteAnalysis[]> {
  const fetchAuth = client(getAccessToken);
  const res = await fetchAuth(apiUrl('/aste/analyses'), { cache: 'no-store' });
  if (!res.ok) throw new Error(`list failed: ${res.status}`);
  return (await res.json()) as AsteAnalysis[];
}

export async function uploadDocument(
  getAccessToken: TokenGetter,
  analysisId: string,
  file: File,
  docType: DocType,
): Promise<AsteDocument> {
  const fetchAuth = client(getAccessToken);
  const body = new FormData();
  body.append('file', file);
  body.append('docType', docType);
  const res = await fetchAuth(apiUrl(`/aste/analyses/${analysisId}/documents`), {
    method: 'POST',
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `upload failed: ${res.status}`);
  }
  return (await res.json()) as AsteDocument;
}

export async function submitAnalysis(
  getAccessToken: TokenGetter,
  id: string,
): Promise<AsteAnalysis> {
  const fetchAuth = client(getAccessToken);
  const res = await fetchAuth(apiUrl(`/aste/analyses/${id}/submit`), { method: 'POST' });
  if (!res.ok) throw new Error(`submit failed: ${res.status}`);
  return (await res.json()) as AsteAnalysis;
}

export async function deleteAnalysis(getAccessToken: TokenGetter, id: string): Promise<void> {
  const fetchAuth = client(getAccessToken);
  const res = await fetchAuth(apiUrl(`/aste/analyses/${id}`), { method: 'DELETE' });
  if (!res.ok) throw new Error(`delete failed: ${res.status}`);
}
