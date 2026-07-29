import { Injectable, Logger } from '@nestjs/common';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';

export type WhatsAppSendResult =
  | { ok: true; messageId: string }
  | { ok: false; reason: 'not_configured' | 'not_on_whatsapp' | 'api_error'; message?: string };

/**
 * Meta WhatsApp Cloud API — authentication template with copy-code button.
 * Credentials from env; when unset, callers fall back to email OTP.
 */
@Injectable()
export class WhatsAppCloudClient {
  private readonly log = new Logger(WhatsAppCloudClient.name);

  constructor(@InjectConfig() private readonly config: ApiConfig) {}

  get configured(): boolean {
    return Boolean(
      this.config.WHATSAPP_TOKEN &&
        this.config.WHATSAPP_PHONE_NUMBER_ID &&
        this.config.WHATSAPP_OTP_TEMPLATE,
    );
  }

  async sendAuthenticationOtp(phoneE164: string, code: string): Promise<WhatsAppSendResult> {
    if (!this.configured) return { ok: false, reason: 'not_configured' };

    const to = phoneE164.replace(/^\+/, '');
    const url = `https://graph.facebook.com/${this.config.WHATSAPP_GRAPH_VERSION}/${this.config.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const body = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: this.config.WHATSAPP_OTP_TEMPLATE,
        language: { code: this.config.WHATSAPP_OTP_TEMPLATE_LANG },
        components: [
          {
            type: 'body',
            parameters: [{ type: 'text', text: code }],
          },
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{ type: 'text', text: code }],
          },
        ],
      },
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as {
        messages?: { id: string }[];
        error?: { message?: string; code?: number };
      } | null;
      if (!res.ok) {
        const msg = json?.error?.message ?? `HTTP ${res.status}`;
        this.log.warn(`WhatsApp send failed: ${msg}`);
        // 131026 = undeliverable / not on WhatsApp (common)
        if (json?.error?.code === 131026) {
          return { ok: false, reason: 'not_on_whatsapp', message: msg };
        }
        return { ok: false, reason: 'api_error', message: msg };
      }
      const messageId = json?.messages?.[0]?.id ?? 'unknown';
      return { ok: true, messageId };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.log.warn(`WhatsApp network error: ${message}`);
      return { ok: false, reason: 'api_error', message };
    }
  }
}
