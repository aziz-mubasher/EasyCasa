import { Injectable, Logger } from '@nestjs/common';

import {
  WhatsAppCloudClient,
  type WhatsAppSendResult,
  type WhatsAppTemplateSendInput,
} from './whatsapp-cloud.client';

/**
 * Single WhatsApp integration point (K EC 7.1 Phase A).
 * Consumers: phone OTP, transactional notifications, conversations (later).
 */
@Injectable()
export class WhatsAppService {
  private readonly log = new Logger(WhatsAppService.name);

  constructor(private readonly cloud: WhatsAppCloudClient) {}

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
