import { Injectable, Logger } from '@nestjs/common';

import {
  WhatsAppCloudClient,
  type WhatsAppSendResult,
  type WhatsAppTemplateSendInput,
} from './whatsapp-cloud.client';
import { WhatsAppInboundService } from './whatsapp-inbound.service';

/**
 * Single WhatsApp integration point (K EC 7.1 Phase A + EC-17 inbound).
 * Consumers: phone OTP, transactional notifications, inbound ack.
 */
@Injectable()
export class WhatsAppService {
  private readonly log = new Logger(WhatsAppService.name);

  constructor(
    private readonly cloud: WhatsAppCloudClient,
    private readonly inbound: WhatsAppInboundService,
  ) {}

  get configured(): boolean {
    return this.cloud.configured;
  }

  get otpConfigured(): boolean {
    return this.cloud.otpConfigured;
  }

  sendAuthenticationOtp(phoneE164: string, code: string): Promise<WhatsAppSendResult> {
    return this.cloud.sendAuthenticationOtp(phoneE164, code);
  }

  /** Utility / future templates — Phase C+ callers. */
  sendTemplate(input: WhatsAppTemplateSendInput): Promise<WhatsAppSendResult> {
    return this.cloud.sendTemplate(input);
  }

  sendText(phoneE164: string, text: string): Promise<WhatsAppSendResult> {
    return this.cloud.sendText(phoneE164, text);
  }

  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
    return this.cloud.verifySignature(rawBody, signatureHeader);
  }

  /** Phase A–C: log delivery statuses; durable status table deferred. */
  ingestStatusPayload(payload: unknown): void {
    const entries = extractStatuses(payload);
    for (const s of entries) {
      this.log.log(`whatsapp status id=${s.id} status=${s.status}`);
    }
  }

  /**
   * EC-17: statuses (unchanged) + persist new inbound messages.
   * Returns internal ids for fire-and-forget auto-reply / ops email after 200.
   */
  async ingestWebhookPayload(payload: unknown): Promise<string[]> {
    this.ingestStatusPayload(payload);
    return this.inbound.persistNewMessages(payload);
  }

  handleInboundAfterPersist(ids: string[]): Promise<void> {
    return this.inbound.handleAfterPersist(ids);
  }
}

function extractStatuses(payload: unknown): Array<{ id: string; status: string }> {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as {
    entry?: Array<{
      changes?: Array<{
        value?: { statuses?: Array<{ id?: string; status?: string }> };
      }>;
    }>;
  };
  const out: Array<{ id: string; status: string }> = [];
  for (const entry of root.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const st of change.value?.statuses ?? []) {
        if (st.id && st.status) out.push({ id: st.id, status: st.status });
      }
    }
  }
  return out;
}
