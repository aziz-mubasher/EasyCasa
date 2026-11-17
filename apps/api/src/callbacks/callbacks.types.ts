import type { ConfirmWithin } from '@easycasa/shared';

import type { BusyBlock, TimeOff, WeeklyRange } from './slots';

export type StoredCall = {
  id: string;
  conversationId: string;
  calledNumber: string;
  callerNumber: string | null;
  contactId: string | null;
  callerName: string;
  callbackPhone: string | null;
  callbackRequested: boolean;
  preferredCallbackTime: string;
  language: string;
  topic: string;
  callerRole: string;
  summary: string;
  title: string;
  durationSecs: number;
  evaluations: Record<string, string>;
  elevenlabsUrl: string;
  createdAt: string;
};

export type StoredCallback = {
  id: string;
  contactId: string | null;
  voiceCallId: string;
  conversationId: string;
  calledNumber: string;
  callbackLanguage: string;
  topic: string;
  callerRole: string;
  callerWords: string;
  ownerProfileId: string;
  backupProfileId: string | null;
  dueAt: string;
  status: string;
  suggestedSlots: unknown[];
  confirmedStart: string | null;
  confirmedEnd: string | null;
  bookingId: string | null;
  overdueOwnerAt: string | null;
  overdueBackupAt: string | null;
  createdAt: string;
};

export type StoredProfile = {
  id: string;
  kind: 'person' | 'team_queue';
  adminUserId: string | null;
  name: string;
  email: string;
  whatsappE164: string | null;
  languages: string[];
  callbackMin: number;
  gapMin: number;
  maxPerDay: number | null;
  earliestMin: number;
  weekly: WeeklyRange[];
  timeOff: TimeOff[];
};

export type StoredRoute = {
  id: string;
  calledNumber: string;
  language: string;
  line: 'easy_casa' | 'easy_legenda' | null;
  forwardProfileId: string;
  backupProfileId: string | null;
  confirmWithin: ConfirmWithin;
  alertWhatsapp: boolean;
  alertEmail: boolean;
  offerRealSlots: boolean;
};

export type StoredEvent = {
  id: string;
  callbackId: string;
  actorUserId: string | null;
  action: string;
  detail: Record<string, unknown>;
  createdAt: string;
};

export type StaffUser = { id: string; displayName: string; email: string | null };

export interface CallbacksStore {
  findCall(conversationId: string): Promise<StoredCall | null>;
  insertCall(row: Omit<StoredCall, 'id' | 'createdAt'>): Promise<{ row: StoredCall; created: boolean }>;
  updateCallContact(id: string, contactId: string): Promise<void>;
  insertCallback(row: Omit<StoredCallback, 'id' | 'createdAt' | 'suggestedSlots' | 'confirmedStart' | 'confirmedEnd' | 'bookingId' | 'overdueOwnerAt' | 'overdueBackupAt'>): Promise<StoredCallback>;
  findCallbackByConversation(conversationId: string): Promise<StoredCallback | null>;
  listCallbacks(): Promise<StoredCallback[]>;
  getCallback(id: string): Promise<StoredCallback | null>;
  updateCallback(id: string, patch: Partial<StoredCallback>): Promise<StoredCallback>;
  addEvent(callbackId: string, actorUserId: string | null, action: string, detail: Record<string, unknown>): Promise<void>;
  listEvents(callbackId: string): Promise<StoredEvent[]>;
  listCalls(page: number, pageSize: number): Promise<{ items: StoredCall[]; total: number }>;
  countCallsSince(iso: string): Promise<number>;
  profiles(): Promise<StoredProfile[]>;
  getProfile(id: string): Promise<StoredProfile | null>;
  saveProfile(row: StoredProfile): Promise<StoredProfile>;
  routes(calledNumber: string): Promise<StoredRoute[]>;
  saveRoutes(calledNumber: string, rows: StoredRoute[]): Promise<StoredRoute[]>;
  busy(fromIso: string, toIso: string): Promise<BusyBlock[]>;
  bookIfFree(input: {
    profileId: string;
    callbackId: string;
    start: Date;
    end: Date;
    gapMin: number;
  }): Promise<{ bookingId: string } | { conflict: true }>;
  listStaff(query: string): Promise<StaffUser[]>;
}
