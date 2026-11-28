import { Injectable, Logger } from '@nestjs/common';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import { documentRefusalText, detectFence, fenceReply } from './fences';
import {
  nextStateAfterInbound,
  planFirstContactReply,
  type ContactState,
} from './first-contact/engine';
import { EcConsultKbSyncService } from './ec-consult-kb-sync.service';
import { EcConsultMemoryStore } from './ec-consult-memory.store';
import { stubModelReply } from './model/model-stub';
import { runOutputGate } from './output-gate/gate';
import { ecConsultRuntime } from './ec-consult-runtime';

export type InboundEcMessage = {
  waId: string;
  body: string;
  messageType: string;
  receivedAt: string;
};

@Injectable()
export class EcConsultOrchestratorService {
  private readonly log = new Logger(EcConsultOrchestratorService.name);

  constructor(
    @InjectConfig() private readonly config: ApiConfig,
    private readonly kb: EcConsultKbSyncService,
    readonly store: EcConsultMemoryStore,
  ) {}

  runtime() {
    return ecConsultRuntime(this.config);
  }

  handleInbound(msg: InboundEcMessage): { outbound: Array<{ text: string; kind: string }>; skipped: boolean } {
    const rt = this.runtime();
    if (!rt.lineEnabled) {
      if (this.store.markNoopLoggedOnce()) {
        this.log.warn('EC Consult line disabled — inbound ignored');
      }
      return { outbound: [], skipped: true };
    }
    if (rt.missingEnv.length && this.store.markNoopLoggedOnce()) {
      this.log.warn(`EC Consult missing env (${rt.missingEnv.join(', ')}) — dry fixtures only`);
    }

    const state = this.store.getState(msg.waId);
    const paused = state.aiPausedUntil && new Date(state.aiPausedUntil).getTime() > Date.now();
    if (paused) {
      this.store.appendMessage(msg.waId, {
        id: `in-${msg.receivedAt}`,
        waId: msg.waId,
        direction: 'in',
        author: 'customer',
        body: msg.body,
        receivedAt: msg.receivedAt,
      });
      return { outbound: [], skipped: true };
    }

    if (msg.messageType === 'audio') {
      const lang = state.language ?? 'ur';
      const text = stubModelReply('[voice]', lang);
      return this.finish(msg, state, [{ text, markAi: true, kind: 'voice_stt' }]);
    }

    if (msg.messageType === 'document' || msg.messageType === 'image') {
      this.log.log('document received');
      const text = documentRefusalText(state.language ?? 'it');
      return this.finish(msg, state, [{ text, markAi: true, kind: 'document_refusal' }]);
    }

    const fence = detectFence(msg.body);
    const fenceText = fenceReply(fence, state.language ?? 'it');
    if (fenceText) {
      return this.finish(msg, state, [{ text: fenceText, markAi: true, kind: fence }]);
    }

    const planned = planFirstContactReply(msg.body, state, { messageType: msg.messageType });
    const resolved = planned.map((p) => {
      if (p.text === '__MODEL__') {
        const text = stubModelReply(msg.body, state.language ?? 'it');
        return { ...p, text };
      }
      return p;
    });

    return this.finish(msg, state, resolved);
  }

  private finish(
    msg: InboundEcMessage,
    state: ContactState,
    planned: Array<{ text: string; markAi: boolean; kind: string }>,
  ): { outbound: Array<{ text: string; kind: string }>; skipped: boolean } {
    this.store.appendMessage(msg.waId, {
      id: `in-${msg.receivedAt}`,
      waId: msg.waId,
      direction: 'in',
      author: 'customer',
      body: msg.body,
      receivedAt: msg.receivedAt,
    });
    const next = nextStateAfterInbound(state, msg.body, planned);
    this.store.setState(msg.waId, next);

    const kb = this.kb.getCanonical().text;
    const rt = this.runtime();
    const out: Array<{ text: string; kind: string }> = [];
    for (const row of planned) {
      if (!this.kb.kbUsable() && row.kind !== 'message1' && row.kind !== 'message2') {
        continue;
      }
      const hits = runOutputGate(row.text, next.language ?? 'it', kb);
      let text = row.text;
      if (hits.length) {
        this.log.warn(`EC Consult output gate blocked (${hits.map((h) => h.kind).join(',')})`);
        text =
          'Non posso inviare questa risposta. Posso farla richiamare dal team Easy Casa: risponda con 3.';
      }
      if (rt.dryRun || !rt.canSend) {
        this.log.log(`EC Consult dry-run outbound (${row.kind}): ${text.slice(0, 80)}…`);
        this.store.appendMessage(msg.waId, {
          id: `out-${Date.now()}`,
          waId: msg.waId,
          direction: 'out',
          author: 'ai',
          body: text,
          receivedAt: new Date().toISOString(),
          dryRunLogged: true,
        });
        out.push({ text, kind: row.kind });
        continue;
      }
      this.store.appendMessage(msg.waId, {
        id: `out-${Date.now()}`,
        waId: msg.waId,
        direction: 'out',
        author: 'ai',
        body: text,
        receivedAt: new Date().toISOString(),
      });
      out.push({ text, kind: row.kind });
    }
    return { outbound: out, skipped: false };
  }

  pauseAfterHumanReply(waId: string): void {
    const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    this.store.pauseAi(waId, until);
  }
}