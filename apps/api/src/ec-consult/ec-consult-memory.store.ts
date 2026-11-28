import type { ContactState } from './first-contact/engine';

export type ThreadMessage = {
  id: string;
  waId: string;
  direction: 'in' | 'out';
  author: 'customer' | 'ai' | 'human';
  body: string;
  receivedAt: string;
  dryRunLogged?: boolean;
};

export class EcConsultMemoryStore {
  private states = new Map<string, ContactState>();
  private messages = new Map<string, ThreadMessage[]>();
  private loggedNoop = false;

  markNoopLoggedOnce(): boolean {
    if (this.loggedNoop) return false;
    this.loggedNoop = true;
    return true;
  }

  getState(waId: string): ContactState {
    return (
      this.states.get(waId) ?? {
        language: null,
        firstContactStep: 'none',
        menuMissCount: 0,
        lastRoute: null,
        windowStartedAt: null,
        aiPausedUntil: null,
        optOut: false,
      }
    );
  }

  setState(waId: string, state: ContactState): void {
    this.states.set(waId, state);
  }

  appendMessage(waId: string, msg: ThreadMessage): void {
    const row = this.messages.get(waId) ?? [];
    row.push(msg);
    this.messages.set(waId, row);
  }

  listThreads(): Array<{ waId: string; preview: string; lastAt: string }> {
    const out: Array<{ waId: string; preview: string; lastAt: string }> = [];
    for (const [waId, rows] of this.messages) {
      const last = rows[rows.length - 1];
      if (!last) continue;
      out.push({ waId, preview: last.body.slice(0, 120), lastAt: last.receivedAt });
    }
    return out.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  }

  listMessages(waId: string): ThreadMessage[] {
    return [...(this.messages.get(waId) ?? [])];
  }

  pauseAi(waId: string, untilIso: string): void {
    const s = this.getState(waId);
    this.setState(waId, { ...s, aiPausedUntil: untilIso });
  }
}