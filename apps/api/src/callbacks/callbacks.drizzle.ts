import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, ilike, or, sql } from 'drizzle-orm';
import type { ConfirmWithin } from '@easycasa/shared';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import {
  callbackBookings,
  callbackEvents,
  callbackProfiles,
  callbackRequests,
  callbackRouting,
  users,
  voiceCalls,
} from '../db/schema';
import type { BusyBlock, TimeOff, WeeklyRange } from './slots';
import type {
  CallbacksStore,
  StaffUser,
  StoredCall,
  StoredCallback,
  StoredEvent,
  StoredProfile,
  StoredRoute,
} from './callbacks.types';

function weeklyOf(value: unknown): WeeklyRange[] {
  if (!Array.isArray(value)) return [];
  const out: WeeklyRange[] = [];
  for (const row of value) {
    if (!row || typeof row !== 'object') continue;
    const r = row as { weekday?: unknown; startMin?: unknown; endMin?: unknown };
    if (typeof r.weekday === 'number' && typeof r.startMin === 'number' && typeof r.endMin === 'number') {
      out.push({ weekday: r.weekday, startMin: r.startMin, endMin: r.endMin });
    }
  }
  return out;
}

function timeOffOf(value: unknown): TimeOff[] {
  if (!Array.isArray(value)) return [];
  const out: TimeOff[] = [];
  for (const row of value) {
    if (!row || typeof row !== 'object') continue;
    const r = row as { startDate?: unknown; endDate?: unknown; weekdays?: unknown };
    if (typeof r.startDate !== 'string' || typeof r.endDate !== 'string') continue;
    const weekdays = Array.isArray(r.weekdays) ? r.weekdays.filter((n): n is number => typeof n === 'number') : null;
    out.push({ startDate: r.startDate, endDate: r.endDate, weekdays });
  }
  return out;
}

function mapCall(r: typeof voiceCalls.$inferSelect): StoredCall {
  return {
    id: r.id,
    conversationId: r.conversationId,
    calledNumber: r.calledNumber,
    callerNumber: r.callerNumber,
    contactId: r.contactId,
    callerName: r.callerName,
    callbackPhone: r.callbackPhone,
    callbackRequested: r.callbackRequested,
    preferredCallbackTime: r.preferredCallbackTime,
    language: r.language,
    topic: r.topic,
    callerRole: r.callerRole,
    summary: r.summary,
    title: r.title,
    durationSecs: r.durationSecs,
    evaluations: (r.evaluations ?? {}) as Record<string, string>,
    elevenlabsUrl: r.elevenlabsUrl,
    createdAt: r.createdAt.toISOString(),
  };
}

function mapCallback(r: typeof callbackRequests.$inferSelect): StoredCallback {
  return {
    id: r.id,
    contactId: r.contactId,
    voiceCallId: r.voiceCallId,
    conversationId: r.conversationId,
    calledNumber: r.calledNumber,
    callbackLanguage: r.callbackLanguage,
    topic: r.topic,
    callerRole: r.callerRole,
    callerWords: r.callerWords,
    ownerProfileId: r.ownerProfileId,
    backupProfileId: r.backupProfileId,
    dueAt: r.dueAt.toISOString(),
    status: r.status,
    suggestedSlots: Array.isArray(r.suggestedSlots) ? r.suggestedSlots : [],
    confirmedStart: r.confirmedStart?.toISOString() ?? null,
    confirmedEnd: r.confirmedEnd?.toISOString() ?? null,
    bookingId: r.bookingId,
    overdueOwnerAt: r.overdueOwnerAt?.toISOString() ?? null,
    overdueBackupAt: r.overdueBackupAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

function mapProfile(r: typeof callbackProfiles.$inferSelect): StoredProfile {
  return {
    id: r.id,
    kind: r.kind === 'team_queue' ? 'team_queue' : 'person',
    adminUserId: r.adminUserId,
    name: r.displayName,
    email: r.email,
    whatsappE164: r.whatsappE164,
    languages: r.languages ?? [],
    callbackMin: r.callbackMinutes,
    gapMin: r.gapMinutes,
    maxPerDay: r.maxPerDay,
    earliestMin: r.earliestBookableMinutes,
    weekly: weeklyOf(r.weeklyHours),
    timeOff: timeOffOf(r.timeOff),
  };
}

@Injectable()
export class DrizzleCallbacksStore implements CallbacksStore {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async findCall(conversationId: string): Promise<StoredCall | null> {
    const [row] = await this.db.select().from(voiceCalls).where(eq(voiceCalls.conversationId, conversationId)).limit(1);
    return row ? mapCall(row) : null;
  }

  async insertCall(row: Omit<StoredCall, 'id' | 'createdAt'>): Promise<{ row: StoredCall; created: boolean }> {
    const inserted = await this.db
      .insert(voiceCalls)
      .values({
        conversationId: row.conversationId,
        calledNumber: row.calledNumber,
        callerNumber: row.callerNumber,
        contactId: row.contactId,
        callerName: row.callerName,
        callbackPhone: row.callbackPhone,
        callbackRequested: row.callbackRequested,
        preferredCallbackTime: row.preferredCallbackTime,
        language: row.language,
        topic: row.topic,
        callerRole: row.callerRole,
        summary: row.summary,
        title: row.title,
        durationSecs: row.durationSecs,
        evaluations: row.evaluations,
        elevenlabsUrl: row.elevenlabsUrl,
      })
      .onConflictDoNothing()
      .returning();
    if (inserted[0]) return { row: mapCall(inserted[0]), created: true };
    const existing = await this.findCall(row.conversationId);
    if (!existing) throw new Error('voice call insert conflict without row');
    return { row: existing, created: false };
  }

  async updateCallContact(id: string, contactId: string): Promise<void> {
    await this.db.update(voiceCalls).set({ contactId }).where(eq(voiceCalls.id, id));
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
    const [inserted] = await this.db
      .insert(callbackRequests)
      .values({
        contactId: row.contactId,
        voiceCallId: row.voiceCallId,
        conversationId: row.conversationId,
        calledNumber: row.calledNumber,
        callbackLanguage: row.callbackLanguage,
        topic: row.topic,
        callerRole: row.callerRole,
        callerWords: row.callerWords,
        ownerProfileId: row.ownerProfileId,
        backupProfileId: row.backupProfileId,
        dueAt: new Date(row.dueAt),
        status: row.status,
      })
      .returning();
    return mapCallback(inserted);
  }

  async findCallbackByConversation(conversationId: string): Promise<StoredCallback | null> {
    const [row] = await this.db
      .select()
      .from(callbackRequests)
      .where(eq(callbackRequests.conversationId, conversationId))
      .limit(1);
    return row ? mapCallback(row) : null;
  }

  async listCallbacks(): Promise<StoredCallback[]> {
    const rows = await this.db.select().from(callbackRequests).orderBy(desc(callbackRequests.createdAt));
    return rows.map(mapCallback);
  }

  async getCallback(id: string): Promise<StoredCallback | null> {
    const [row] = await this.db.select().from(callbackRequests).where(eq(callbackRequests.id, id)).limit(1);
    return row ? mapCallback(row) : null;
  }

  async updateCallback(id: string, patch: Partial<StoredCallback>): Promise<StoredCallback> {
    const [row] = await this.db
      .update(callbackRequests)
      .set({
        ...(patch.contactId !== undefined ? { contactId: patch.contactId } : {}),
        ...(patch.ownerProfileId !== undefined ? { ownerProfileId: patch.ownerProfileId } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.suggestedSlots !== undefined ? { suggestedSlots: patch.suggestedSlots } : {}),
        ...(patch.confirmedStart !== undefined ? { confirmedStart: patch.confirmedStart ? new Date(patch.confirmedStart) : null } : {}),
        ...(patch.confirmedEnd !== undefined ? { confirmedEnd: patch.confirmedEnd ? new Date(patch.confirmedEnd) : null } : {}),
        ...(patch.bookingId !== undefined ? { bookingId: patch.bookingId } : {}),
        ...(patch.overdueOwnerAt !== undefined ? { overdueOwnerAt: patch.overdueOwnerAt ? new Date(patch.overdueOwnerAt) : null } : {}),
        ...(patch.overdueBackupAt !== undefined ? { overdueBackupAt: patch.overdueBackupAt ? new Date(patch.overdueBackupAt) : null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(callbackRequests.id, id))
      .returning();
    return mapCallback(row);
  }

  async addEvent(callbackId: string, actorUserId: string | null, action: string, detail: Record<string, unknown>): Promise<void> {
    await this.db.insert(callbackEvents).values({ callbackId, actorUserId, action, detail });
  }

  async listEvents(callbackId: string): Promise<StoredEvent[]> {
    const rows = await this.db
      .select()
      .from(callbackEvents)
      .where(eq(callbackEvents.callbackId, callbackId))
      .orderBy(callbackEvents.createdAt);
    return rows.map((r) => ({
      id: r.id,
      callbackId: r.callbackId,
      actorUserId: r.actorUserId,
      action: r.action,
      detail: (r.detail ?? {}) as Record<string, unknown>,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async listCalls(page: number, pageSize: number): Promise<{ items: StoredCall[]; total: number }> {
    const [totalRow] = await this.db.select({ n: sql<number>`count(*)::int` }).from(voiceCalls);
    const rows = await this.db
      .select()
      .from(voiceCalls)
      .orderBy(desc(voiceCalls.createdAt))
      .limit(pageSize)
      .offset(Math.max(0, (page - 1) * pageSize));
    return { items: rows.map(mapCall), total: Number(totalRow?.n ?? 0) };
  }

  async countCallsSince(iso: string): Promise<number> {
    const [row] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(voiceCalls)
      .where(gte(voiceCalls.createdAt, new Date(iso)));
    return Number(row?.n ?? 0);
  }

  async profiles(): Promise<StoredProfile[]> {
    const rows = await this.db.select().from(callbackProfiles);
    return rows.map(mapProfile);
  }

  async getProfile(id: string): Promise<StoredProfile | null> {
    const [row] = await this.db.select().from(callbackProfiles).where(eq(callbackProfiles.id, id)).limit(1);
    return row ? mapProfile(row) : null;
  }

  async saveProfile(row: StoredProfile): Promise<StoredProfile> {
    const values = {
      kind: row.kind,
      adminUserId: row.adminUserId,
      displayName: row.name,
      email: row.email,
      whatsappE164: row.whatsappE164,
      languages: row.languages,
      callbackMinutes: row.callbackMin,
      gapMinutes: row.gapMin,
      maxPerDay: row.maxPerDay,
      earliestBookableMinutes: row.earliestMin,
      weeklyHours: row.weekly,
      timeOff: row.timeOff,
      updatedAt: new Date(),
    };
    const [saved] = await this.db
      .insert(callbackProfiles)
      .values({ id: row.id, ...values })
      .onConflictDoUpdate({ target: callbackProfiles.id, set: values })
      .returning();
    return mapProfile(saved);
  }

  async routes(calledNumber: string): Promise<StoredRoute[]> {
    const rows = await this.db.select().from(callbackRouting).where(eq(callbackRouting.calledNumber, calledNumber));
    return rows.map((r) => ({
      id: r.id,
      calledNumber: r.calledNumber,
      language: r.language,
      line: r.line === 'easy_legenda' || r.line === 'easy_casa' ? r.line : null,
      forwardProfileId: r.forwardProfileId,
      backupProfileId: r.backupProfileId,
      confirmWithin: (r.confirmWithin === '2h' || r.confirmWithin === '1d' ? r.confirmWithin : '4h') as ConfirmWithin,
      alertWhatsapp: r.alertWhatsapp,
      alertEmail: r.alertEmail,
      offerRealSlots: r.offerRealSlots,
    }));
  }

  async saveRoutes(calledNumber: string, rows: StoredRoute[]): Promise<StoredRoute[]> {
    await this.db.delete(callbackRouting).where(eq(callbackRouting.calledNumber, calledNumber));
    if (rows.length === 0) return [];
    await this.db.insert(callbackRouting).values(
      rows.map((r) => ({
        id: r.id,
        calledNumber,
        language: r.language,
        line: r.line,
        forwardProfileId: r.forwardProfileId,
        backupProfileId: r.backupProfileId,
        confirmWithin: r.confirmWithin,
        alertWhatsapp: r.alertWhatsapp,
        alertEmail: r.alertEmail,
        offerRealSlots: false,
      })),
    );
    return this.routes(calledNumber);
  }

  async busy(fromIso: string, toIso: string): Promise<BusyBlock[]> {
    const rows = await this.db
      .select()
      .from(callbackBookings)
      .where(and(gte(callbackBookings.endsAt, new Date(fromIso)), sql`${callbackBookings.startsAt} < ${new Date(toIso)}`));
    return rows.map((r) => ({ profileId: r.profileId, start: r.startsAt, end: r.endsAt }));
  }

  async bookIfFree(input: {
    profileId: string;
    callbackId: string;
    start: Date;
    end: Date;
    gapMin: number;
  }): Promise<{ bookingId: string } | { conflict: true }> {
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(callbackBookings)
        .where(eq(callbackBookings.profileId, input.profileId));
      const gap = input.gapMin * 60_000;
      const hit = rows.some(
        (b) => input.start.getTime() < b.endsAt.getTime() + gap && input.end.getTime() + gap > b.startsAt.getTime(),
      );
      if (hit) return { conflict: true };
      const [row] = await tx
        .insert(callbackBookings)
        .values({
          profileId: input.profileId,
          callbackId: input.callbackId,
          startsAt: input.start,
          endsAt: input.end,
          kind: 'confirmed',
        })
        .returning();
      return { bookingId: row.id };
    });
  }

  async listStaff(query: string): Promise<StaffUser[]> {
    const q = query.trim();
    const cond = q
      ? and(eq(users.role, 'admin'), or(ilike(users.displayName, `%${q}%`), ilike(users.email, `%${q}%`)))
      : eq(users.role, 'admin');
    const rows = await this.db
      .select({ id: users.id, displayName: users.displayName, email: users.email })
      .from(users)
      .where(cond)
      .limit(50);
    return rows.map((r) => ({ id: r.id, displayName: r.displayName ?? r.email ?? 'Admin', email: r.email }));
  }
}
