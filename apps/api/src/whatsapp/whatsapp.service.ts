import { Injectable, Logger } from '@nestjs/common';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import {
  WhatsAppCloudClient,
  type WhatsAppSendResult,
  type WhatsAppTemplateSendInput,
} from './whatsapp-cloud.client';
import { WhatsAppInboundService } from './whatsapp-inbound.service';
import { WhatsAppMessagesStore, type WhatsAppSendMeta } from './whatsapp-messages.store';

export type WhatsAppTemplateSendWithMeta = WhatsAppTemplateSendInput & {
  meta?: WhatsAppSendMeta;
};

/**
 * Single WhatsApp integration point (K EC 7.1 + EC-16 + EC-17 inbound).
 * Consumers: phone OTP, transactional notifications, inbound ack;
 * status → whatsapp_messages.
 */
@Injectable()
export class WhatsAppService {
  private readonly log = new Logger(WhatsAppService.name);

  constructor(
    private readonly cloud: WhatsAppCloudClient,
    private readonly inbound: WhatsAppInboundService,
    private readonly messages: WhatsAppMessagesStore,
    @InjectConfig() private readonly config: ApiConfig,
  ) {}

  get configured(): boolean {
    return this.cloud.configured;
  }

  get otpConfigured(): boolean {
    return this.cloud.otpConfigured;
  }

  async sendAuthenticationOtp(
    phoneE164: string,
    code: string,
    meta?: WhatsAppSendMeta,
  ): Promise<WhatsAppSendResult> {
    const result = await this.cloud.sendAuthenticationOtp(phoneE164, code);
    if (this.otpConfigured) {
      await this.messages.recordSendAttempt({
        templateName: this.config.WHATSAPP_OTP_TEMPLATE || 'otp',
        locale: meta?.locale ?? this.config.WHATSAPP_OTP_TEMPLATE_LANG,
        meta: { relatedType: 'otp', ...meta },
        result,
      });
    }
    return result;
  }

  /** Utility templates — persist send/fail row (no body content). Skip row when not_configured. */
  async sendTemplate(input: WhatsAppTemplateSendWithMeta): Promise<WhatsAppSendResult> {
    const { meta, ...cloudInput } = input;
    const locale = cloudInput.languageCode ?? meta?.locale ?? this.config.WHATSAPP_OTP_TEMPLATE_LANG;
    const result = await this.cloud.sendTemplate(cloudInput);
    if (!result.ok && result.reason === 'not_configured') return result;
    await this.messages.recordSendAttempt({
      templateName: cloudInput.templateName,
      locale,
      meta,
      result,
    });
    return result;
  }

  sendText(phoneE164: string, text: string): Promise<WhatsAppSendResult> {
    return this.cloud.sendText(phoneE164, text);
  }

  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
    return this.cloud.verifySignature(rawBody, signatureHeader);
  }

  /** EC-16: update whatsapp_messages by provider_message_id. */
  async ingestStatusPayload(payload: unknown): Promise<void> {
    const entries = extractStatuses(payload);
    for (const s of entries) {
      this.log.log(`whatsapp status id=${s.id} status=${s.status}`);
      await this.messages.applyStatusUpdate(s.id, s.status, s.errors);
    }
  }

  /**
   * EC-17: statuses (EC-16 store) + persist new inbound messages.
   * Returns internal ids for fire-and-forget auto-reply / ops email after 200.
   */
  async ingestWebhookPayload(payload: unknown): Promise<string[]> {
    await this.ingestStatusPayload(payload);
    return this.inbound.persistNewMessages(payload);
  }

  handleInboundAfterPersist(ids: string[]): Promise<void> {
    return this.inbound.handleAfterPersist(ids);
  }
}

function extractStatuses(
  payload: unknown,
): Array<{ id: string; status: string; errors?: string }> {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          statuses?: Array<{
            id?: string;
            status?: string;
            errors?: Array<{ title?: string; message?: string; code?: number }>;
          }>;
        };
      }>;
    }>;
  };
  const out: Array<{ id: string; status: string; errors?: string }> = [];
  for (const entry of root.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const st of change.value?.statuses ?? []) {
        if (st.id && st.status) {
          const err = st.errors?.[0];
          const errors = err
            ? [err.code != null ? String(err.code) : null, err.title, err.message]
                .filter(Boolean)
                .join(': ')
            : undefined;
          out.push({ id: st.id, status: st.status, errors });
        }
      }
    }
  }
  return out;
}
