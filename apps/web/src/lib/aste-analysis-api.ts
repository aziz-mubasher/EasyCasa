/** Client helpers for EC-22/24/23b aste analysis + report API (flag-gated on server). */

import { createAuthedFetch, apiUrl } from '@/auth/authedFetch';

export type AsteAnalysis = {
  id: string;
  status: string;
  language: string;
  register: string;
  lottoLabel?: string | null;
  failureReason?: string | null;
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

export type AsteSourceRef = { file: string; page: number };

export type AsteSourcedNumber = {
  value: number;
  source: AsteSourceRef;
};

export type AsteCauzione = {
  pct: number | null;
  base: 'prezzo_base' | 'prezzo_offerto' | null;
  importo: number | null;
  source: AsteSourceRef | null;
};

export type AsteImmobileUnit = {
  tipologia: string | null;
  piano: string | null;
  vani: number | null;
  locali: string[];
  categoria_catastale: string | null;
  foglio: string | null;
  particella: string | null;
  subalterno: string | null;
  rendita: number | null;
  indirizzo: string | null;
  comune: string | null;
  provincia: string | null;
  note_valore: string | null;
};

/** EC-23b extraction schema v2 (report rejects v1 with ASTE_REPROCESS_REQUIRED). */
export type AsteExtractionV2 = {
  schema_version: 2;
  procedura: {
    tipo: 'rge' | 'lg' | 'ei' | 'fall' | 'altro' | null;
    numero: string | null;
    rge: string | null;
    tribunale: string | null;
    lotto: string | null;
    giudice_delegato: string | null;
    data_asta: string | null;
    termine_offerte: string | null;
    modalita: 'telematica' | 'mista' | 'analogica' | null;
  };
  economics: {
    valore_stima: AsteSourcedNumber | null;
    prezzo_base: AsteSourcedNumber | null;
    offerta_minima: AsteSourcedNumber | null;
    cauzione: AsteCauzione | null;
    rilancio_minimo: AsteSourcedNumber | null;
    superficie_commerciale_mq: AsteSourcedNumber | null;
  };
  immobili: AsteImmobileUnit[];
  giuridica: Record<string, unknown>;
  urbanistica: Record<string, unknown>;
  condizioni: Record<string, unknown>;
  spese: Record<string, unknown>;
  meta: {
    documents: Array<{ file: string; doc_type: string; pages: number; ocr_pages: number }>;
    not_found: string[];
    warnings: string[];
    schema_version: 2;
    lotto: { label: string | null; source: string | null } | null;
    lotti_trovati: string[];
  };
};

export type AsteReport = {
  id: string;
  status: string;
  register: string;
  tribunale: string | null;
  rge: string | null;
  lotto: string | null;
  lottoLabel: string | null;
  dataAsta: string | null;
  termineOfferte: string | null;
  addressRaw: string | null;
  comune: string | null;
  provincia: string | null;
  extraction: AsteExtractionV2;
  semaforo?: Record<string, string>;
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
  viewMode?: 'teaser' | 'full';
  semaforoAggregate?: string;
  entitlement?: {
    monetisationEnabled: boolean;
    unlocked: boolean;
    creditBalance: number;
  };
};

export class AsteApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'AsteApiError';
    this.status = status;
    this.code = code;
  }
}

type TokenGetter = () => Promise<string | null>;

function client(getAccessToken: TokenGetter) {
  return createAuthedFetch(getAccessToken);
}

async function readError(res: Response, fallback: string): Promise<AsteApiError> {
  const body = (await res.json().catch(() => ({}))) as {
    message?: string | { code?: string; message?: string };
    code?: string;
  };
  if (typeof body.message === 'object' && body.message) {
    return new AsteApiError(
      body.message.message || fallback,
      res.status,
      body.message.code ?? body.code,
    );
  }
  return new AsteApiError(
    (typeof body.message === 'string' ? body.message : null) || fallback,
    res.status,
    body.code,
  );
}

export async function createAnalysis(
  getAccessToken: TokenGetter,
  input: {
    language: 'it' | 'en' | 'es';
    register: 'investor' | 'first_buyer';
    lottoLabel?: string | null;
  },
): Promise<AsteAnalysis> {
  const fetchAuth = client(getAccessToken);
  const res = await fetchAuth(apiUrl('/aste/analyses'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await readError(res, `create failed: ${res.status}`);
  return (await res.json()) as AsteAnalysis;
}

export async function getAnalysis(
  getAccessToken: TokenGetter,
  id: string,
): Promise<AsteAnalysis> {
  const fetchAuth = client(getAccessToken);
  const res = await fetchAuth(apiUrl(`/aste/analyses/${id}`), { cache: 'no-store' });
  if (!res.ok) throw await readError(res, `get failed: ${res.status}`);
  return (await res.json()) as AsteAnalysis;
}

export async function listAnalyses(getAccessToken: TokenGetter): Promise<AsteAnalysis[]> {
  const fetchAuth = client(getAccessToken);
  const res = await fetchAuth(apiUrl('/aste/analyses'), { cache: 'no-store' });
  if (!res.ok) throw await readError(res, `list failed: ${res.status}`);
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
  if (!res.ok) throw await readError(res, `submit failed: ${res.status}`);
  return (await res.json()) as AsteAnalysis;
}

export async function resubmitAnalysis(
  getAccessToken: TokenGetter,
  id: string,
): Promise<AsteAnalysis> {
  const fetchAuth = client(getAccessToken);
  const res = await fetchAuth(apiUrl(`/aste/analyses/${id}/resubmit`), { method: 'POST' });
  if (!res.ok) throw await readError(res, `resubmit failed: ${res.status}`);
  return (await res.json()) as AsteAnalysis;
}

export async function deleteAnalysis(getAccessToken: TokenGetter, id: string): Promise<void> {
  const fetchAuth = client(getAccessToken);
  const res = await fetchAuth(apiUrl(`/aste/analyses/${id}`), { method: 'DELETE' });
  if (!res.ok) throw await readError(res, `delete failed: ${res.status}`);
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
  if (!res.ok) throw await readError(res, `report failed: ${res.status}`);
  return (await res.json()) as AsteReport;
}

export async function getCreditBalance(getAccessToken: TokenGetter): Promise<{ balance: number }> {
  const fetchAuth = client(getAccessToken);
  const res = await fetchAuth(apiUrl('/aste/credits/balance'), { cache: 'no-store' });
  if (!res.ok) throw await readError(res, `balance failed: ${res.status}`);
  return (await res.json()) as { balance: number };
}

export async function listCreditPacks(
  getAccessToken: TokenGetter,
): Promise<{ packs: Array<{ credits: number }> }> {
  const fetchAuth = client(getAccessToken);
  const res = await fetchAuth(apiUrl('/aste/credits/packs'), { cache: 'no-store' });
  if (!res.ok) throw await readError(res, `packs failed: ${res.status}`);
  return (await res.json()) as { packs: Array<{ credits: number }> };
}

export async function checkoutCreditPack(
  getAccessToken: TokenGetter,
  pack: 1 | 3 | 10,
): Promise<{ url: string }> {
  const fetchAuth = client(getAccessToken);
  const res = await fetchAuth(apiUrl('/aste/credits/checkout'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pack }),
  });
  if (!res.ok) throw await readError(res, `checkout failed: ${res.status}`);
  return (await res.json()) as { url: string };
}

export async function unlockReport(
  getAccessToken: TokenGetter,
  analysisId: string,
): Promise<{ unlocked: boolean; creditBalance: number; alreadyUnlocked: boolean }> {
  const fetchAuth = client(getAccessToken);
  const res = await fetchAuth(apiUrl(`/aste/analyses/${analysisId}/unlock`), {
    method: 'POST',
  });
  if (!res.ok) throw await readError(res, `unlock failed: ${res.status}`);
  return (await res.json()) as {
    unlocked: boolean;
    creditBalance: number;
    alreadyUnlocked: boolean;
  };
}

export async function patchAnalysis(
  getAccessToken: TokenGetter,
  id: string,
  body: Partial<AsteBuyerProfile> & {
    register?: 'investor' | 'first_buyer';
    skip_buyer_profile?: boolean;
    lottoLabel?: string | null;
  },
): Promise<{
  register?: string;
  buyerProfile?: AsteBuyerProfile | null;
  buyerReadiness?: AsteReport['buyerReadiness'];
  semaforo?: Record<string, string>;
  lottoLabel?: string | null;
  status?: string;
}> {
  const fetchAuth = client(getAccessToken);
  const res = await fetchAuth(apiUrl(`/aste/analyses/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await readError(res, `patch failed: ${res.status}`);
  return (await res.json()) as {
    register?: string;
    buyerProfile?: AsteBuyerProfile | null;
    buyerReadiness?: AsteReport['buyerReadiness'];
    semaforo?: Record<string, string>;
    lottoLabel?: string | null;
    status?: string;
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
  if (!res.ok) throw await readError(res, `chat history failed: ${res.status}`);
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
  if (!res.ok) throw await readError(res, `chat ask failed: ${res.status}`);
  return (await res.json()) as {
    userMessage: ChatMessage;
    assistantMessage: ChatMessage;
    filenameById: Record<string, string>;
  };
}
