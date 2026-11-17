import { randomUUID } from 'node:crypto';
import { CALLBACK_LANGUAGES, CALLBACK_TEAM_QUEUE_ID, EASY_CASA_VOICE_E164 } from '@easycasa/shared';

import type { BusyBlock } from './slots';
import type {
  CallbacksStore,
  StaffUser,
  StoredCall,
  StoredCallback,
  StoredEvent,
  StoredProfile,
  StoredRoute,
} from './callbacks.types';

function teamProfile(): StoredProfile {
  return {
    id: CALLBACK_TEAM_QUEUE_ID,
    kind: 'team_queue',
    adminUserId: null,
    name: 'Team',
    email: 'info@easycasaita.com',
    whatsappE164: null,
    languages: ['it'],
    callbackMin: 20,
    gapMin: 10,
    maxPerDay: null,
    earliestMin: 120,
    weekly: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startMin: 9 * 60, endMin: 18 * 60 })),
    timeOff: [],
  };
}

function seedRoutes(): StoredRoute[] {
  return CALLBACK_LANGUAGES.map((language) => ({
    id: randomUUID(),
    calledNumber: EASY_CASA_VOICE_E164,
    language,
    line: null,
    forwardProfileId: CALLBACK_TEAM_QUEUE_ID,
    backupProfileId: null,
    confirmWithin: '4h' as const,
    alertWhatsapp: false,
    alertEmail: true,
    offerRealSlots: false,
  }));
}

export class MemoryCallbacksStore implements CallbacksStore {
  calls: StoredCall[] = [];
  callbacks: StoredCallback[] = [];
  events: StoredEvent[] = [];
  profileRows: StoredProfile[] = [teamProfile()];
  routeRows = seedRoutes();
  bookings: Array<BusyBlock & { id: string; callbackId: string }> = [];
  staff: StaffUser[] = [];

  async findCall(conversationId: string): Promise<StoredCall | null> {
    return this.calls.find((c) => c.conversationId === conversationId) ?? null;
  }

  async updateCallContact(id: string, contactId: string): Promise<void> {
    const row = this.calls.find((c) => c.id === id);
    if (row) row.contactId = contactId;
  }

  async insertCall(row: Omit<StoredCall, 'id' | 'createdAt'>): Promise<{ row: StoredCall; created: boolean }> {
    const existing = await this.findCall(row.conversationId);
    if (existing) return { row: existing, created: false };
    const stored: StoredCall = { ...row, id: randomUUID(), createdAt: new Date().toISOString() };
    this.calls.push(stored);
    return { row: stored, created: true };
  }

  async insertCallback(
    row: Omit<
      StoredCallback,
      | 'id'
      | 'createdAt'
      | 'suggestedSlots'
      | 'confirmedStart'
      | 'confirmedEnd'
      | 'bookingId'
      | 'overdueOwnerAt'
      | 'overdueBackupAt'
    >,
  ): Promise<StoredCallback> {
    const stored: StoredCallback = {
      ...row,
      id: randomUUID(),
      suggestedSlots: [],
      confirmedStart: null,
      confirmedEnd: null,
      bookingId: null,
      overdueOwnerAt: null,
      overdueBackupAt: null,
      createdAt: new Date().toISOString(),
    };
    this.callbacks.push(stored);
    return stored;
  }

  async findCallbackByConversation(conversationId: string): Promise<StoredCallback | null> {
    return this.callbacks.find((c) => c.conversationId === conversationId) ?? null;
  }

  async listCallbacks(): Promise<StoredCallback[]> {
    return [...this.callbacks];
  }

  async getCallback(id: string): Promise<StoredCallback | null> {
    return this.callbacks.find((c) => c.id === id) ?? null;
  }

  async updateCallback(id: string, patch: Partial<StoredCallback>): Promise<StoredCallback> {
    const row = this.callbacks.find((c) => c.id === id);
    if (!row) throw new Error('missing callback');
    Object.assign(row, patch);
    return row;
  }

  async addEvent(
    callbackId: string,
    actorUserId: string | null,
    action: string,
    detail: Record<string, unknown>,
  ): Promise<void> {
    this.events.push({
      id: randomUUID(),
      callbackId,
      actorUserId,
      action,
      detail,
      createdAt: new Date().toISOString(),
    });
  }

  async listEvents(callbackId: string): Promise<StoredEvent[]> {
    return this.events.filter((e) => e.callbackId === callbackId);
  }

  async listCalls(page: number, pageSize: number): Promise<{ items: StoredCall[]; total: number }> {
    const sorted = [...this.calls].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const start = Math.max(0, (page - 1) * pageSize);
    return { items: sorted.slice(start, start + pageSize), total: sorted.length };
  }

  async countCallsSince(iso: string): Promise<number> {
    return this.calls.filter((c) => c.createdAt >= iso).length;
  }

  async profiles(): Promise<StoredProfile[]> {
    return [...this.profileRows];
  }

  async getProfile(id: string): Promise<StoredProfile | null> {
    return this.profileRows.find((p) => p.id === id) ?? null;
  }

  async saveProfile(row: StoredProfile): Promise<StoredProfile> {
    const idx = this.profileRows.findIndex((p) => p.id === row.id);
    if (idx >= 0) this.profileRows[idx] = row;
    else this.profileRows.push(row);
    return row;
  }

  async routes(calledNumber: string): Promise<StoredRoute[]> {
    return this.routeRows.filter((r) => r.calledNumber === calledNumber);
  }

  async saveRoutes(calledNumber: string, rows: StoredRoute[]): Promise<StoredRoute[]> {
    this.routeRows = [...this.routeRows.filter((r) => r.calledNumber !== calledNumber), ...rows];
    return rows;
  }

  async busy(): Promise<BusyBlock[]> {
    return this.bookings.map((b) => ({ profileId: b.profileId, start: b.start, end: b.end }));
  }

  async bookIfFree(input: {
    profileId: string;
    callbackId: string;
    start: Date;
    end: Date;
    gapMin: number;
  }): Promise<{ bookingId: string } | { conflict: true }> {
    const gap = input.gapMin * 60_000;
    const hit = this.bookings.some(
      (b) =>
        b.profileId === input.profileId &&
        input.start.getTime() < b.end.getTime() + gap &&
        input.end.getTime() + gap > b.start.getTime(),
    );
    if (hit) return { conflict: true };
    const id = randomUUID();
    this.bookings.push({
      id,
      callbackId: input.callbackId,
      profileId: input.profileId,
      start: input.start,
      end: input.end,
    });
    return { bookingId: id };
  }

  async listStaff(query: string): Promise<StaffUser[]> {
    const q = query.trim().toLowerCase();
    return this.staff.filter(
      (s) =>
        !q ||
        s.displayName.toLowerCase().includes(q) ||
        (s.email ?? '').toLowerCase().includes(q),
    );
  }
}
