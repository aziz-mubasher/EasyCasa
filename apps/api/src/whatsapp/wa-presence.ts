import { Injectable } from '@nestjs/common';

const ONLINE_MS = 2 * 60 * 1000;

export type InAppAlert = {
  leadId: string;
  step: string;
  subject: string;
  href: string;
};

/**
 * Consultant presence and the in-admin alert inbox.
 * Memory only. It is not personal history and it is never exported.
 */
@Injectable()
export class WaPresenceService {
  private readonly beats = new Map<string, { available: boolean; at: number }>();
  private readonly inbox = new Map<string, InAppAlert[]>();

  beat(userId: string, available: boolean, now = Date.now()): void {
    this.beats.set(userId, { available, at: now });
  }

  online(now = Date.now()): string[] {
    const ids: string[] = [];
    for (const [id, beat] of this.beats) {
      if (beat.available && now - beat.at < ONLINE_MS) ids.push(id);
    }
    return ids;
  }

  push(userIds: readonly string[], alert: InAppAlert): void {
    for (const id of userIds) {
      const list = this.inbox.get(id) ?? [];
      if (!list.some((item) => item.leadId === alert.leadId && item.step === alert.step)) {
        list.push(alert);
      }
      this.inbox.set(id, list);
    }
  }

  list(userId: string): InAppAlert[] {
    return this.inbox.get(userId) ?? [];
  }

  clearLead(leadId: string): void {
    for (const [id, list] of this.inbox) {
      this.inbox.set(id, list.filter((item) => item.leadId !== leadId));
    }
  }
}
