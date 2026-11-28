import { Injectable, Logger } from '@nestjs/common';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import { EC_CONSULT_E164 } from './ec-consult-lines';

export type TextCallbackFields = {
  name: string;
  callbackPhone: string;
  language: string;
  role: string;
  topic: string;
  preferredTime: string;
};

const ALLOWED_KEYS = new Set(['name', 'callbackPhone', 'language', 'role', 'topic', 'preferredTime']);

@Injectable()
export class EcConsultCallbackService {
  private readonly log = new Logger(EcConsultCallbackService.name);
  private rows: Array<TextCallbackFields & { source: string; contactWaId: string }> = [];

  constructor(@InjectConfig() private readonly config: ApiConfig) {}

  ingest(fields: Record<string, string>, contactWaId: string): { ok: true; id: string } {
    for (const key of Object.keys(fields)) {
      if (!ALLOWED_KEYS.has(key)) throw new Error(`disallowed field ${key}`);
    }
    const row: TextCallbackFields & { source: string; contactWaId: string } = {
      name: fields.name ?? '',
      callbackPhone: fields.callbackPhone ?? '',
      language: fields.language ?? 'it',
      role: fields.role ?? '',
      topic: fields.topic ?? '',
      preferredTime: fields.preferredTime ?? '',
      source: 'whatsapp_text',
      contactWaId,
    };
    const id = `wtxt_${contactWaId}_${this.rows.length + 1}`;
    this.rows.push(row);
    this.log.log(`whatsapp_text callback queued for ${EC_CONSULT_E164} (${id})`);
    void this.config;
    return { ok: true, id };
  }

  listForTests() {
    return [...this.rows];
  }
}