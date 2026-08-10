/** Client helpers for EC-22/24 aste analysis + report API (flag-gated on server). */

import { createAuthedFetch, apiUrl } from '@/auth/authedFetch';

export type AsteAnalysis = {
  id: string;
  status: string;
  language: string;
  register: string;
  documents?: AsteDocument[];
  extraction?: unknown;
  semaforo?: Record<string, string> | null;
  omiCheck?: unknown;
  buyerProfile?: AsteBuyerProfile | null;
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

export type AsteBuyerProfile = {
  residency: 'it_resident' | 'eu_nonresident' | 'non_eu' | null;
  purpose: 'prima_casa' | 'investimento' | null;
  has_cf: boolean | null;
  has_pec_firma: boolean | null;
  financing_needed: boolean | null;
};

export type AsteReport = {
  id: string;
  status: string;
  register: string;
  tribunale: string | null;
  rge: string | null;
  lotto: string | null;
  dataAsta: string | null;
  termineOfferte: string | null;
  addressRaw: string | null;
  comune: string | null;
  provincia: string | null;
  extraction: {
    schema_version: 1;
    procedura: Record<string, unknown>;
    economics: Record<string, { value: number; source: { file: string; page: number } } | null>;
    immobile: Record<string, unknown>;
    giuridica: Record<string, unknown>;
    urbanistica: Record<string, unknown>;
    condizioni: Record<string, unknown>;
    spese: Record<string, unknown>;
    meta: {
      documents: Array<{ file: string; doc_type: string; pages: number; ocr_pages: number }>;
      not_found: string[];
      warnings: string[];
      schema_version: 1;
    };
  };
  semaforo: Record<string, string>;
  omiCheck: {
    available: boolean;
    method: 'zone' | 'comune' | null;
    confidence: string | null;
    omi_range: { min: number; max: number; mid: number } | null;
    omi_range_unit: 'total_eur' | 'eur_per_mq' | null;
    omi_eur_mq: { min: number; max: number; mid: number } | null;
    sconto_reale_pct: number | null;
    prezzo_base_vs_omi_pct: number | null;
    valore_stima_vs_omi_pct: number | null;
    attribution: string;
    warnings: string[];
    period: string | null;
  } | null;
  buyerProfile: AsteBuyerProfile | null;
  buyerReadiness: {
    level: string;
    checklist: Array<{ key: string; level: string }>;
    profile_skipped: boolean;
  };
  buyerProfileSkipped: boolean;
  translations: Record<string, string>;
  reportContentLang: 'it' | 'en';
  esContentFallback: boolean;
  criticita: Array<{
    dimension: string;
    level: string;
    action_key: string;
    problema_it: string[];
  }>;
  documents: Array<{
    id: string;
    originalFilename: string;
    docType: string;
    pageCount: number | null;
  }>;
  filenameById: Record<string, string>;
  glossary: Array<{ termKey: string; definition: string; counselReviewed: boolean }>;
  translateCalls?: number;
};

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

export async function getReport(
  getAccessToken: TokenGetter,
  id: string,
  lang: 'it' | 'en' | 'es',
  opts?: { printed?: boolean },
): Promise<AsteReport> {
  const fetchAuth = client(getAccessToken);
  const q = new URLSearchParams({ lang });
  if (opts?.printed) q.set('printed', '1');
  const res = await fetchAuth(apiUrl(`/aste/analyses/${id}/report?${q}`), { cache: 'no-store' });
  if (!res.ok) throw new Error(`report failed: ${res.status}`);
  return (await res.json()) as AsteReport;
}

export async function patchAnalysis(
  getAccessToken: TokenGetter,
  id: string,
  body: Partial<AsteBuyerProfile> & {
    register?: 'investor' | 'first_buyer';
    skip_buyer_profile?: boolean;
  },
): Promise<{
  register: string;
  buyerProfile: AsteBuyerProfile | null;
  buyerReadiness: AsteReport['buyerReadiness'];
  semaforo: Record<string, string>;
}> {
  const fetchAuth = client(getAccessToken);
  const res = await fetchAuth(apiUrl(`/aste/analyses/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`patch failed: ${res.status}`);
  return (await res.json()) as {
    register: string;
    buyerProfile: AsteBuyerProfile | null;
    buyerReadiness: AsteReport['buyerReadiness'];
    semaforo: Record<string, string>;
  };
}

export type ChatCitation = { document_id: string; page: number };

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  lang: string;
  citations: ChatCitation[] | null;
  refused?: boolean;
  createdAt: string;
};

export async function getChatHistory(
  getAccessToken: TokenGetter,
  id: string,
): Promise<{ messages: ChatMessage[]; filenameById: Record<string, string> }> {
  const fetchAuth = client(getAccessToken);
  const res = await fetchAuth(apiUrl(`/aste/analyses/${id}/chat`), { cache: 'no-store' });
  if (!res.ok) throw new Error(`chat history failed: ${res.status}`);
  return (await res.json()) as { messages: ChatMessage[]; filenameById: Record<string, string> };
}

export async function askChat(
  getAccessToken: TokenGetter,
  id: string,
  input: { question: string; lang: 'it' | 'en' },
): Promise<{
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  filenameById: Record<string, string>;
}> {
  const fetchAuth = client(getAccessToken);
  const res = await fetchAuth(apiUrl(`/aste/analyses/${id}/chat`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (res.status === 429) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message || 'rate_limited');
  }
  if (!res.ok) throw new Error(`chat ask failed: ${res.status}`);
  return (await res.json()) as {
    userMessage: ChatMessage;
    assistantMessage: ChatMessage;
    filenameById: Record<string, string>;
  };
}
