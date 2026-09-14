import { Injectable, Logger } from '@nestjs/common';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';

const DEFAULT_MODEL = 'claude-sonnet-4-5';
const ANTHROPIC_VERSION = '2023-06-01';
const TIMEOUT_MS = 30_000;

export type ClaudeCompleteResult =
  | { ok: true; text: string; model: string }
  | { ok: false; reason: 'not_configured' | 'api_error' | 'timeout'; message?: string };

type AnthropicContentBlock = { type?: string; text?: string };
type AnthropicMessage = {
  model?: string;
  content?: AnthropicContentBlock[];
  error?: { message?: string };
};

/**
 * Thin Anthropic Messages client for WhatsApp operator assist.
 * Key is optional — empty means the desk feature is off.
 */
@Injectable()
export class WhatsAppClaudeClient {
  private readonly log = new Logger(WhatsAppClaudeClient.name);

  constructor(@InjectConfig() private readonly config: ApiConfig) {}

  get configured(): boolean {
    if (this.config.DEMO_MODE) return false;
    return Boolean(this.config.ANTHROPIC_API_KEY.trim());
  }

  get model(): string {
    return this.config.ANTHROPIC_MODEL.trim() || DEFAULT_MODEL;
  }

  async complete(system: string, user: string, maxTokens = 1024): Promise<ClaudeCompleteResult> {
    if (!this.configured) return { ok: false, reason: 'not_configured' };

    const base = this.config.ANTHROPIC_BASE_URL.replace(/\/$/, '') || 'https://api.anthropic.com';
    const url = `${base}/v1/messages`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.config.ANTHROPIC_API_KEY.trim(),
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: maxTokens,
          system,
          messages: [{ role: 'user', content: user }],
        }),
        signal: controller.signal,
      });
      const raw = (await res.json().catch(() => null)) as AnthropicMessage | null;
      if (!res.ok) {
        const detail = raw?.error?.message || `HTTP ${res.status}`;
        this.log.warn(`claude_http_error status=${res.status} ${detail}`);
        return { ok: false, reason: 'api_error', message: detail };
      }
      const text = (raw?.content ?? [])
        .filter((b) => b.type === 'text' && typeof b.text === 'string')
        .map((b) => b.text!.trim())
        .filter(Boolean)
        .join('\n')
        .trim();
      if (!text) {
        return { ok: false, reason: 'api_error', message: 'empty Claude response' };
      }
      return { ok: true, text, model: raw?.model || this.model };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { ok: false, reason: 'timeout', message: 'Claude request timed out' };
      }
      const message = err instanceof Error ? err.message : 'claude request failed';
      this.log.warn(`claude_request_failed ${message}`);
      return { ok: false, reason: 'api_error', message };
    } finally {
      clearTimeout(timer);
    }
  }
}
