import { Inject, Injectable, Logger } from '@nestjs/common';

import type { ApiConfig } from '../config';
import { APP_CONFIG } from '../config/config.module';
import type { AsteExtraction } from './extraction-schema';

export type OcrPage = { page: number; text: string; ocr_used: boolean };

export type OcrResult = {
  pages: OcrPage[];
  page_count: number;
  ocr_pages: number;
};

export type ExtractDocumentInput = {
  file: string;
  doc_type: string;
  pages: Array<{ page: number; text: string }>;
};

/** EC-23 — Nest → FastAPI `/aste/*` client (internal token; no new deps). */
@Injectable()
export class AsteAiClient {
  private readonly log = new Logger(AsteAiClient.name);

  constructor(@Inject(APP_CONFIG) private readonly config: ApiConfig) {}

  private base(): string {
    const u = (this.config.AI_URL || '').replace(/\/$/, '');
    if (!u) throw new Error('AI_URL not configured');
    return u;
  }

  private token(): string {
    const t = this.config.AI_INTERNAL_TOKEN || '';
    if (!t) throw new Error('AI_INTERNAL_TOKEN not configured');
    return t;
  }

  async ocr(file: {
    buffer: Buffer;
    filename: string;
    mimetype: string;
  }): Promise<OcrResult> {
    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }),
      file.filename || 'document',
    );
    return (await this.fetchJson('/aste/ocr', {
      method: 'POST',
      headers: { 'X-EC-Internal': this.token() },
      body: form,
      timeoutMs: this.config.ASTE_OCR_TIMEOUT_MS,
    })) as OcrResult;
  }

  async extract(input: {
    language: string;
    documents: ExtractDocumentInput[];
    lotto_label?: string | null;
  }): Promise<AsteExtraction> {
    return (await this.fetchJson('/aste/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-EC-Internal': this.token(),
      },
      body: JSON.stringify(input),
      timeoutMs: this.config.ASTE_EXTRACT_TIMEOUT_MS,
    })) as AsteExtraction;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const res = (await this.fetchJson('/aste/embed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-EC-Internal': this.token(),
      },
      body: JSON.stringify({ texts }),
      timeoutMs: this.config.ASTE_EMBED_TIMEOUT_MS,
    })) as { embeddings: number[][] };
    return res.embeddings;
  }

  /** EC-24 — literal translation of free-text snippets (cached by Nest). */
  async translate(input: { texts: string[]; target_lang: string }): Promise<string[]> {
    if (input.texts.length === 0) return [];
    const res = (await this.fetchJson('/aste/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-EC-Internal': this.token(),
      },
      body: JSON.stringify(input),
      timeoutMs: this.config.ASTE_TRANSLATE_TIMEOUT_MS,
    })) as { translations: string[] };
    return res.translations;
  }

  /** EC-25 — grounded answer from retrieved chunks (stateless AI). */
  async chatAnswer(input: {
    question: string;
    answer_lang: string;
    chunks: Array<{ document_id: string; page: number; text: string }>;
    glossary: Array<{ term_key: string; definition: string }>;
    lotto_label?: string | null;
  }): Promise<{
    answer: string;
    citations: Array<{ document_id: string; page: number }>;
    refused: boolean;
  }> {
    return (await this.fetchJson('/aste/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-EC-Internal': this.token(),
      },
      body: JSON.stringify(input),
      timeoutMs: this.config.ASTE_CHAT_TIMEOUT_MS,
    })) as {
      answer: string;
      citations: Array<{ document_id: string; page: number }>;
      refused: boolean;
    };
  }

  private async fetchJson(
    path: string,
    opts: {
      method: string;
      headers: Record<string, string>;
      body: BodyInit;
      timeoutMs: number;
    },
  ): Promise<unknown> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs);
    try {
      const res = await fetch(this.base() + path, {
        method: opts.method,
        headers: opts.headers,
        body: opts.body,
        signal: ctrl.signal,
      });
      if (!res.ok) {
        this.log.warn(
          JSON.stringify({ event: 'aste.ai_http_error', path, status: res.status }),
        );
        throw new Error(`AI ${path} HTTP ${res.status}`);
      }
      return (await res.json()) as unknown;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`AI ${path} timeout`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
