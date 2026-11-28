import { Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import { EC_CONSULT_PHONE_ID_6605 } from './ec-consult-lines';
import { EcConsultOrchestratorService } from './ec-consult-orchestrator.service';
import { is6605PhoneId } from './ec-consult-runtime';

@Injectable()
export class EcConsultWebhookService {
  private readonly log = new Logger(EcConsultWebhookService.name);

  constructor(
    @InjectConfig() private readonly config: ApiConfig,
    private readonly orchestrator: EcConsultOrchestratorService,
  ) {}

  verify6605Signature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
    const secret = this.config.WHATSAPP_6605_APP_SECRET.trim();
    if (!secret || !signatureHeader?.startsWith('sha256=')) return false;
    const digest = createHmac('sha256', secret).update(rawBody).digest('hex');
    const provided = signatureHeader.slice('sha256='.length);
    try {
      return timingSafeEqual(Buffer.from(digest, 'utf8'), Buffer.from(provided, 'utf8'));
    } catch {
      return false;
    }
  }

  payloadTargets6605(payload: unknown): boolean {
    const ids = extractPhoneNumberIds(payload);
    return ids.some((id) => is6605PhoneId(id));
  }

  async ingest(payload: unknown): Promise<void> {
    const messages = extractCustomerMessages(payload);
    for (const row of messages) {
      if (!is6605PhoneId(row.phoneNumberId)) continue;
      if (row.messageType === 'call') {
        this.log.log('EC Consult webhook: call event dropped');
        continue;
      }
      const body = row.body ?? '';
      this.orchestrator.handleInbound({
        waId: row.waId,
        body,
        messageType: row.messageType,
        receivedAt: row.receivedAt,
      });
    }
  }
}

function extractPhoneNumberIds(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as { entry?: Array<{ changes?: Array<{ value?: { metadata?: { phone_number_id?: string } } }> }> };
  const out = new Set<string>();
  for (const entry of root.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const id = change.value?.metadata?.phone_number_id;
      if (id) out.add(String(id));
    }
  }
  return [...out];
}

type Row = {
  waId: string;
  phoneNumberId: string;
  messageType: string;
  body: string | null;
  receivedAt: string;
};

function extractCustomerMessages(payload: unknown): Row[] {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          metadata?: { phone_number_id?: string };
          messages?: Array<Record<string, unknown>>;
          contacts?: Array<{ wa_id?: string }>;
        };
      }>;
    }>;
  };
  const out: Row[] = [];
  for (const entry of root.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = String(value?.metadata?.phone_number_id ?? '');
      const contacts = value?.contacts ?? [];
      for (const msg of value?.messages ?? []) {
        const waId = String((msg as { from?: string }).from ?? contacts[0]?.wa_id ?? '');
        const type = String((msg as { type?: string }).type ?? 'unknown');
        let body: string | null = null;
        if (type === 'text') body = String((msg as { text?: { body?: string } }).text?.body ?? '');
        const ts = String((msg as { timestamp?: string }).timestamp ?? Math.floor(Date.now() / 1000));
        out.push({
          waId,
          phoneNumberId,
          messageType: type,
          body,
          receivedAt: new Date(Number(ts) * 1000).toISOString(),
        });
      }
    }
  }
  return out;
}

export { EC_CONSULT_PHONE_ID_6605 };