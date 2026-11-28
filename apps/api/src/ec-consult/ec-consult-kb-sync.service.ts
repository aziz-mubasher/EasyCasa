import { Injectable, Logger } from '@nestjs/common';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import {
  KB_CANONICAL_ID,
  KB_FIRST_CONTACT_ID,
  type KbSnapshot,
  hashText,
  loadFixtureCanonicalKb,
} from './ec-consult-kb';

@Injectable()
export class EcConsultKbSyncService {
  private readonly log = new Logger(EcConsultKbSyncService.name);
  private canonical: KbSnapshot = loadFixtureCanonicalKb();
  private firstContact: KbSnapshot | null = null;
  private lastHashChange: string | null = null;
  private testsPassedAfterHashChange = true;

  constructor(@InjectConfig() private readonly config: ApiConfig) {}

  getCanonical(): KbSnapshot {
    return this.canonical;
  }

  getLastHashChange(): string | null {
    return this.lastHashChange;
  }

  markTestsPassedAfterHashChange(): void {
    this.testsPassedAfterHashChange = true;
  }

  kbUsable(): boolean {
    return this.testsPassedAfterHashChange;
  }

  async syncFromElevenLabs(now = new Date()): Promise<{ ok: boolean; reason?: string }> {
    const key = this.config.ELEVENLABS_KB_READ_KEY.trim();
    if (!key) {
      this.log.warn('EC Consult KB sync skipped: ELEVENLABS_KB_READ_KEY missing (fixture kept)');
      return { ok: false, reason: 'missing_key' };
    }
    const base = this.config.ELEVENLABS_API_BASE_URL.replace(/\/$/, '');
    const canon = await this.fetchDoc(base, key, KB_CANONICAL_ID);
    if (!canon.ok) return canon;
    const first = await this.fetchDoc(base, key, KB_FIRST_CONTACT_ID);
    if (!first.ok) return first;
    this.applySnapshot(canon.snapshot!, now);
    this.firstContact = first.snapshot!;
    return { ok: true };
  }

  private applySnapshot(incoming: KbSnapshot, now: Date): void {
    if (incoming.hash !== this.canonical.hash) {
      this.log.warn(`EC Consult KB hash changed ${this.canonical.hash.slice(0, 8)} → ${incoming.hash.slice(0, 8)}`);
      this.lastHashChange = now.toISOString();
      this.testsPassedAfterHashChange = false;
    }
    this.canonical = incoming;
  }

  private async fetchDoc(
    base: string,
    key: string,
    id: string,
  ): Promise<{ ok: boolean; reason?: string; snapshot?: KbSnapshot }> {
    const res = await fetch(`${base}/v1/convai/knowledge-base/${id}`, {
      headers: { 'xi-api-key': key },
    });
    if (!res.ok) {
      this.log.warn(`KB fetch ${id} failed HTTP ${res.status}`);
      return { ok: false, reason: `http_${res.status}` };
    }
    const data = (await res.json()) as { text?: string; last_updated_at_unix_secs?: number };
    const text = typeof data.text === 'string' ? data.text : '';
    if (!text.trim()) return { ok: false, reason: 'empty' };
    return {
      ok: true,
      snapshot: {
        docId: id,
        text,
        hash: hashText(text),
        updatedAtUnix: Number(data.last_updated_at_unix_secs ?? 0),
      },
    };
  }
}