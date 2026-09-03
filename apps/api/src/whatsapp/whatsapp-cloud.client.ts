import { Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';

export type WhatsAppSendResult =
  | { ok: true; messageId: string }
  | { ok: false; reason: 'not_configured' | 'not_on_whatsapp' | 'api_error'; message?: string };

export type WhatsAppTemplateSendInput = {
  phoneE164: string;
  templateName: string;
  languageCode?: string;
  /** Body text parameters in order. */
  bodyParams?: string[];
  /** Optional URL-button copy-code / dynamic suffix (OTP auth templates). */
  buttonUrlParam?: string;
};

/**
 * Meta WhatsApp Cloud API client — single send path for OTP + future utility templates.
 * Credentials from env; DEMO_MODE forces not configured.
 */
@Injectable()
export class WhatsAppCloudClient {
  private readonly log = new Logger(WhatsAppCloudClient.name);

  constructor(@InjectConfig() private readonly config: ApiConfig) {}

  get configured(): boolean {
    if (this.config.DEMO_MODE) return false;
    return Boolean(this.config.WHATSAPP_TOKEN && this.config.WHATSAPP_PHONE_NUMBER_ID);
  }

  get otpConfigured(): boolean {
    return this.configured && Boolean(this.config.WHATSAPP_OTP_TEMPLATE);
  }

  async sendAuthenticationOtp(phoneE164: string, code: string): Promise<WhatsAppSendResult> {
    if (!this.otpConfigured) return { ok: false, reason: 'not_configured' };
    return this.sendTemplate({
      phoneE164,
      templateName: this.config.WHATSAPP_OTP_TEMPLATE,
      languageCode: this.config.WHATSAPP_OTP_TEMPLATE_LANG,
      bodyParams: [code],
      buttonUrlParam: code,
    });
  }

  async sendTemplate(input: WhatsAppTemplateSendInput): Promise<WhatsAppSendResult> {
    if (!this.configured) return { ok: false, reason: 'not_configured' };
    if (!input.templateName.trim()) return { ok: false, reason: 'not_configured' };

    const to = input.phoneE164.replace(/^\+/, '');
    const url = `https://graph.facebook.com/${this.config.WHATSAPP_GRAPH_VERSION}/${this.config.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const components: Record<string, unknown>[] = [];
    if (input.bodyParams?.length) {
      components.push({
        type: 'body',
        parameters: input.bodyParams.map((text) => ({ type: 'text', text })),
      });
    }
    if (input.buttonUrlParam != null) {
      components.push({
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [{ type: 'text', text: input.buttonUrlParam }],
      });
    }

    const body = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: input.templateName,
        language: { code: input.languageCode ?? 'it' },
        ...(components.length ? { components } : {}),
      },
    };

    return this.postMessages(url, body);
  }

  /** Free-form text inside an open customer-service window (EC-17). No template. */
  async sendText(phoneE164: string, text: string): Promise<WhatsAppSendResult> {
    if (!this.configured) return { ok: false, reason: 'not_configured' };
    const bodyText = text.trim();
    if (!bodyText) return { ok: false, reason: 'not_configured' };

    const to = phoneE164.replace(/^\+/, '');
    const url = this.messagesUrl();
    return this.postMessages(url, {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: bodyText },
    });
  }

  /** Interactive reply buttons (max 3). Session window only. */
  async sendInteractiveButtons(
    phoneE164: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>,
  ): Promise<WhatsAppSendResult> {
    if (!this.configured) return { ok: false, reason: 'not_configured' };
    const text = bodyText.trim();
    if (!text || buttons.length === 0) return { ok: false, reason: 'not_configured' };
    return this.postMessages(this.messagesUrl(), {
      messaging_product: 'whatsapp',
      to: phoneE164.replace(/^\+/, ''),
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text },
        action: {
          buttons: buttons.slice(0, 3).map((b) => ({
            type: 'reply',
            reply: { id: b.id, title: b.title.slice(0, 20) },
          })),
        },
      },
    });
  }

  /** Interactive list (language picker). Session window only. */
  async sendInteractiveList(
    phoneE164: string,
    bodyText: string,
    buttonLabel: string,
    rows: Array<{ id: string; title: string; description?: string }>,
  ): Promise<WhatsAppSendResult> {
    if (!this.configured) return { ok: false, reason: 'not_configured' };
    const text = bodyText.trim();
    if (!text || rows.length === 0) return { ok: false, reason: 'not_configured' };
    return this.postMessages(this.messagesUrl(), {
      messaging_product: 'whatsapp',
      to: phoneE164.replace(/^\+/, ''),
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text },
        action: {
          button: buttonLabel.slice(0, 20),
          sections: [
            {
              title: buttonLabel.slice(0, 24),
              rows: rows.slice(0, 10).map((r) => ({
                id: r.id,
                title: r.title.slice(0, 24),
                ...(r.description ? { description: r.description.slice(0, 72) } : {}),
              })),
            },
          ],
        },
      },
    });
  }

  /** CTA URL button (session). Used for "open listings" — not a template. */
  async sendCtaUrl(
    phoneE164: string,
    bodyText: string,
    displayText: string,
    url: string,
  ): Promise<WhatsAppSendResult> {
    if (!this.configured) return { ok: false, reason: 'not_configured' };
    const text = bodyText.trim();
    if (!text || !url.trim()) return { ok: false, reason: 'not_configured' };
    return this.postMessages(this.messagesUrl(), {
      messaging_product: 'whatsapp',
      to: phoneE164.replace(/^\+/, ''),
      type: 'interactive',
      interactive: {
        type: 'cta_url',
        body: { text },
        action: {
          name: 'cta_url',
          parameters: {
            display_text: displayText.slice(0, 20),
            url: url.trim(),
          },
        },
      },
    });
  }

  private messagesUrl(): string {
    return `https://graph.facebook.com/${this.config.WHATSAPP_GRAPH_VERSION}/${this.config.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  }

  private async postMessages(
    url: string,
    body: Record<string, unknown>,
  ): Promise<WhatsAppSendResult> {
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

  /** Meta webhook X-Hub-Signature-256 check (sha256=hex). Empty secret → reject. */
  verifySignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
    const secret = this.config.WHATSAPP_APP_SECRET;
    if (!secret || !signatureHeader?.startsWith('sha256=')) return false;
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const got = signatureHeader.slice('sha256='.length);
    try {
      const a = Buffer.from(expected, 'hex');
      const b = Buffer.from(got, 'hex');
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
}
