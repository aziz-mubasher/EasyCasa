import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { CALLBACK_LANGUAGES, CALLBACK_TEAM_QUEUE_ID, EASY_CASA_VOICE_E164, allCallbackCopy, scanCallbackCopy } from '@easycasa/shared';
import { describe, expect, it } from 'vitest';

import type { ApiConfig } from '../config';
import type { CrmRepository } from '../crm/domain/ports';
import type { EmailPort } from '../email/email-port';
import type { WhatsAppService } from '../whatsapp/whatsapp.service';
import { MemoryCallbacksStore } from './callbacks.memory';
import { CallbacksService } from './callbacks.service';
import { parseVoiceEvent, type ParsedVoiceCall } from './parse-event';
import { signElevenLabs } from './signature';
import { romeParts } from './rome';
import { parsePreferredTime } from './phrase';
import { freeSlots, suggestSlots, type AvailProfile } from './slots';
import { dueAtFrom } from './working-hours';

const SECRET = 'eleven-test-secret';

function config(over: Partial<ApiConfig> = {}): ApiConfig {
  return {
    CRM_ENABLED: true,
    ELEVENLABS_WEBHOOK_SECRET: SECRET,
    VOICE_CALLBACK_NUMBERS: EASY_CASA_VOICE_E164,
    WHATSAPP_CALLBACK_ACK_TEMPLATE: '',
    WHATSAPP_CALLBACK_CONFIRM_TEMPLATE: '',
    WHATSAPP_CALLBACK_OWNER_TEMPLATE: '',
    ADMIN_PUBLIC_URL: 'https://admin.easycasaita.com',
    EASYCASA_DENOMINAZIONE: 'Easy Casa Ita Srl',
    EASYCASA_PIVA: 'IT00000000000',
    ...over,
  } as ApiConfig;
}

function call(over: Partial<ParsedVoiceCall> = {}): ParsedVoiceCall {
  return {
    conversationId: 'conv-1',
    calledNumber: EASY_CASA_VOICE_E164,
    callerNumber: '+393331112233',
    callerName: 'Maria Rossi',
    callbackPhone: '+393331112233',
    callbackRequested: true,
    preferredCallbackTime: 'domani mattina',
    language: 'it',
    topic: 'EasyCasa',
    callerRole: 'buyer',
    summary: 'Vuole essere richiamata domani mattina.',
    title: 'Richiesta di richiamata',
    durationSecs: 80,
    evaluations: {
      ai_disclosed: 'success',
      no_mediation: 'success',
      no_credit_no_amounts: 'success',
      callback_captured: 'success',
    },
    ...over,
  };
}

function harness(over: Partial<ApiConfig> = {}) {
  const store = new MemoryCallbacksStore();
  const contacts: Array<{ id: string; phone: string; locale: string; source: string; fullName: string }> = [];
  const activities: string[] = [];
  const sent: string[] = [];
  const crm = {
    async findContactByPhone(phone: string) {
      const digits = phone.replace(/\D/g, '');
      const row = contacts.find((c) => c.phone.replace(/\D/g, '') === digits);
      return row ? { ...row, email: null, userId: null, ownerAdminId: null, tags: [], notesSummary: null, marketingConsentId: null, createdAt: '', updatedAt: '' } : null;
    },
    async createContact(input: { fullName: string; phone?: string | null; locale?: string; source: string }) {
      const row = {
        id: `c-${contacts.length + 1}`,
        phone: input.phone ?? '',
        locale: input.locale ?? 'it',
        source: input.source,
        fullName: input.fullName,
      };
      contacts.push(row);
      return row;
    },
    async upsertSeeker() {
      return { id: 's', contactId: 'c', stage: 'new_enquiry' };
    },
    async addActivity(input: { body: string }) {
      activities.push(input.body);
      return { id: 'a' };
    },
  } as unknown as CrmRepository;
  const whatsapp = {
    async sendText(_phone: string, text: string) {
      sent.push(text);
      return { ok: true, messageId: 'm1' };
    },
    async sendTemplate() {
      return { ok: false, reason: 'not_configured' as const };
    },
  } as unknown as WhatsAppService;
  const email: EmailPort = {
    async send(msg) {
      sent.push(msg.subject);
      return { provider: 'noop', delivered: true };
    },
  };
  const svc = new CallbacksService(store, crm, whatsapp, email, config(over));
  return { svc, store, contacts, activities, sent };
}

function payload(over: Record<string, unknown> = {}) {
  return {
    type: 'post_call_transcription',
    data: {
      conversation_id: 'conv-1',
      transcript: [{ role: 'user', message: 'SECRET TRANSCRIPT SHOULD NOT BE STORED' }],
      metadata: {
        call_duration_secs: 80,
        phone_call: { agent_number: EASY_CASA_VOICE_E164, external_number: '+393331112233' },
      },
      analysis: {
        transcript_summary: 'Vuole essere richiamata.',
        call_summary_title: 'Richiamata',
        data_collection_results: {
          caller_name: { value: 'Maria Rossi' },
          callback_phone: { value: '+393331112233' },
          callback_requested: { value: 'true' },
          preferred_callback_time: { value: 'domani mattina' },
          language: { value: 'it' },
          topic: { value: 'EasyCasa' },
          caller_role: { value: 'buyer' },
          callback_owner: { value: 'Team' },
        },
        evaluation_criteria_results: {
          ai_disclosed: { result: 'success' },
          no_mediation: { result: 'success' },
          no_credit_no_amounts: { result: 'success' },
          callback_captured: { result: 'success' },
        },
      },
      ...over,
    },
  };
}

describe('voice callback intake', () => {
  it('creates one contact, one call and one callback, and a replay adds nothing', async () => {
    const { svc, store, contacts } = harness();
    const raw = JSON.stringify(payload());
    const sig = signElevenLabs(raw, SECRET, Math.floor(Date.now() / 1000));
    const first = await svc.ingest(raw, sig);
    const second = await svc.ingest(raw, sig);
    expect(first.duplicate).toBeUndefined();
    expect(second.duplicate).toBe(true);
    expect(contacts).toHaveLength(1);
    expect(contacts[0].source).toBe('whatsapp_voice');
    expect(store.calls).toHaveLength(1);
    expect(store.callbacks).toHaveLength(1);
    expect(store.callbacks[0].callbackLanguage).toBe('it');
    expect(store.callbacks[0].topic).toBe('EasyCasa');
    expect(store.callbacks[0].callerRole).toBe('buyer');
    expect(store.callbacks[0].callerWords).toBe('domani mattina');
    expect(JSON.stringify(store.calls[0])).not.toContain('SECRET TRANSCRIPT');
  });

  it('rejects an unsigned or tampered body', async () => {
    const { svc, store } = harness();
    const raw = JSON.stringify(payload());
    await expect(svc.ingest(raw, undefined)).rejects.toBeInstanceOf(ForbiddenException);
    const sig = signElevenLabs(raw, SECRET, Math.floor(Date.now() / 1000));
    await expect(svc.ingest(`${raw} `, sig)).rejects.toBeInstanceOf(ForbiddenException);
    expect(store.calls).toHaveLength(0);
  });

  it('ignores a number that is not the Easy Casa line', async () => {
    const { svc, store } = harness();
    const raw = JSON.stringify(payload({
      metadata: { call_duration_secs: 10, phone_call: { agent_number: '+390000000000', external_number: '+39111' } },
    }));
    const sig = signElevenLabs(raw, SECRET, Math.floor(Date.now() / 1000));
    const result = await svc.ingest(raw, sig);
    expect(result.ignored).toBe(true);
    expect(store.calls).toHaveLength(0);
  });

  it('sets each of the 11 languages and does not overwrite an existing contact language', async () => {
    const { svc, contacts } = harness();
    contacts.push({
      id: 'existing',
      phone: '+393331112233',
      locale: 'es',
      source: 'whatsapp',
      fullName: 'Maria',
    });
    for (const language of CALLBACK_LANGUAGES) {
      await svc.applyCall(call({ conversationId: `c-${language}`, language }));
    }
    expect(contacts).toHaveLength(1);
    expect(contacts[0].locale).toBe('es');
    const { store } = harness();
    const fresh = new CallbacksService(store, { async findContactByPhone() { return null; }, async createContact(input: { locale?: string }) { return { id: 'n', locale: input.locale }; }, async upsertSeeker() { return {}; }, async addActivity() { return {}; } } as unknown as CrmRepository, { async sendText() { return { ok: true, messageId: 'm' }; }, async sendTemplate() { return { ok: false, reason: 'not_configured' }; } } as unknown as WhatsAppService, { async send() { return { provider: 'noop', delivered: true }; } }, config());
    await fresh.applyCall(call({ language: 'other' as 'it', conversationId: 'empty-lang' }));
    expect(store.callbacks[0]?.callbackLanguage).toBe('it');
  });

  it('routes by language, lets a line row win, and falls back to the Team queue', async () => {
    const { svc, store } = harness();
    const person = '11111111-1111-4111-8111-111111111111';
    store.profileRows.push({
      ...store.profileRows[0],
      id: person,
      kind: 'person',
      name: 'Amina',
    });
    store.routeRows.push({
      id: 'legenda-ur',
      calledNumber: EASY_CASA_VOICE_E164,
      language: 'ur',
      line: 'easy_legenda',
      forwardProfileId: person,
      backupProfileId: CALLBACK_TEAM_QUEUE_ID,
      confirmWithin: '2h',
      alertWhatsapp: false,
      alertEmail: false,
      offerRealSlots: false,
    });
    await svc.applyCall(call({ conversationId: 'ur-casa', language: 'ur', topic: 'EasyCasa' }));
    await svc.applyCall(call({ conversationId: 'ur-legenda', language: 'ur', topic: 'EasyLegenda' }));
    store.routeRows = store.routeRows.filter((r) => r.language !== 'bn');
    await svc.applyCall(call({ conversationId: 'bn', language: 'bn' }));
    const byId = Object.fromEntries(store.callbacks.map((c) => [c.conversationId, c.ownerProfileId]));
    expect(byId['ur-casa']).toBe(CALLBACK_TEAM_QUEUE_ID);
    expect(byId['ur-legenda']).toBe(person);
    expect(byId.bn).toBe(CALLBACK_TEAM_QUEUE_ID);
    store.routeRows = store.routeRows.map((r) =>
      r.language === 'it' && r.line == null ? { ...r, forwardProfileId: person } : r,
    );
    await svc.applyCall(call({ conversationId: 'after-edit', language: 'it' }));
    expect(store.callbacks.find((c) => c.conversationId === 'after-edit')?.ownerProfileId).toBe(person);
  });
});

describe('slot engine and phrases', () => {
  const owner: AvailProfile = {
    id: 'owner',
    name: 'Amina',
    callbackMin: 20,
    gapMin: 10,
    maxPerDay: 2,
    earliestMin: 0,
    weekly: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startMin: 9 * 60, endMin: 12 * 60 })),
    timeOff: [],
  };

  it('parses the four sample phrases into the right window', () => {
    const now = new Date('2026-06-01T08:00:00.000Z'); // Monday 10:00 Rome (CEST)
    const cases: Array<[string, string]> = [
      ['domani mattina', 'morning'],
      ['morgen Vormittag', 'morning'],
      ['amanhã à tarde', 'afternoon'],
      ['kal shaam', 'evening'],
    ];
    for (const [words, label] of cases) {
      const window = parsePreferredTime(words, now);
      expect(window?.label, words).toBe(label);
      const day = romeParts(window!.start);
      expect(day.day, words).toBe(2);
    }
    expect(parsePreferredTime('asdf qqq', now)).toBeNull();
  });

  it('ranks the requested window first and falls back to the next three free slots', () => {
    const now = new Date('2026-06-01T08:00:00.000Z');
    const ranked = suggestSlots({ owner, backup: null, busy: [], words: 'domani mattina', now });
    expect(ranked[0].reason).toBe('Inside the requested time');
    expect(romeParts(new Date(ranked[0].start)).hour).toBeGreaterThanOrEqual(9);
    expect(romeParts(new Date(ranked[0].start)).hour).toBeLessThan(13);
    const fallback = suggestSlots({ owner, backup: null, busy: [], words: 'asdf', now, limit: 3 });
    expect(fallback).toHaveLength(3);
    expect(fallback.every((s) => s.reason === 'Next free')).toBe(true);
  });

  it('subtracts time off, bookings and the gap, and honours the daily max and earliest time', () => {
    const now = new Date('2026-06-01T07:00:00.000Z'); // 09:00 Rome
    const booked = freeSlots(
      owner,
      [{ profileId: 'owner', start: new Date('2026-06-01T07:00:00.000Z'), end: new Date('2026-06-01T07:20:00.000Z') }],
      now,
      6,
    );
    expect(booked[0].start.toISOString()).not.toBe('2026-06-01T07:00:00.000Z');
    expect(booked[0].start.toISOString()).not.toBe('2026-06-01T07:20:00.000Z');
    const capped = freeSlots(owner, [], now, 10);
    const monday = capped.filter((s) => romeParts(s.start).day === 1);
    expect(monday.length).toBeLessThanOrEqual(2);
    const early = freeSlots({ ...owner, earliestMin: 180, maxPerDay: null }, [], now, 1);
    expect(early[0].start.getTime()).toBeGreaterThanOrEqual(now.getTime() + 180 * 60_000);
    const offOwner: AvailProfile = {
      ...owner,
      maxPerDay: null,
      timeOff: [{ startDate: '2026-06-02', endDate: '2026-06-02', weekdays: null }],
    };
    const backup: AvailProfile = { ...owner, id: 'backup', name: 'Luca', maxPerDay: null, timeOff: [] };
    const suggested = suggestSlots({
      owner: offOwner,
      backup,
      busy: [],
      words: 'domani mattina',
      now,
    });
    expect(suggested[0].profileId).toBe('backup');
    expect(suggested[0].backup).toBe(true);
  });

  it('keeps Rome wall time across the DST change', () => {
    const winter = romeParts(new Date('2026-03-27T08:00:00.000Z'));
    const summer = romeParts(new Date('2026-03-30T07:00:00.000Z'));
    expect(winter.hour).toBe(9);
    expect(summer.hour).toBe(9);
    const before = freeSlots(
      { ...owner, maxPerDay: null, weekly: [{ weekday: 5, startMin: 9 * 60, endMin: 10 * 60 }] },
      [],
      new Date('2026-03-27T06:00:00.000Z'),
      1,
    );
    const after = freeSlots(
      { ...owner, maxPerDay: null, weekly: [{ weekday: 1, startMin: 9 * 60, endMin: 10 * 60 }] },
      [],
      new Date('2026-03-30T05:00:00.000Z'),
      1,
    );
    expect(before[0].start.toISOString()).toBe('2026-03-27T08:00:00.000Z');
    expect(after[0].start.toISOString()).toBe('2026-03-30T07:00:00.000Z');
  });
});

describe('confirm, deadline, copy', () => {
  it('confirms one booking and refuses a slot taken meanwhile', async () => {
    const { svc, store, sent } = harness();
    await svc.applyCall(call({ preferredCallbackTime: '' }), new Date('2026-06-01T07:00:00.000Z'));
    const row = store.callbacks[0];
    const suggestions = await svc.suggestionsFor(row, new Date('2026-06-01T07:00:00.000Z'));
    expect(suggestions.length).toBeGreaterThan(0);
    const first = await svc.confirm(row.id, 'admin-1', suggestions[0].start, false, new Date('2026-06-01T07:00:00.000Z'));
    expect(first.bookingId).toBeTruthy();
    expect(store.bookings).toHaveLength(1);
    expect(sent.some((s) => s.includes('La richiamiamo'))).toBe(true);
    await svc.applyCall(call({ conversationId: 'conv-2', preferredCallbackTime: '' }), new Date('2026-06-01T07:00:00.000Z'));
    const other = store.callbacks[1];
    await expect(
      svc.confirm(other.id, 'admin-1', suggestions[0].start, false, new Date('2026-06-01T07:00:00.000Z')),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('places due_at inside working hours and alerts owner and backup once when overdue', async () => {
    const friday1600 = new Date('2026-06-05T14:00:00.000Z'); // Friday 16:00 Rome
    const due = dueAtFrom(friday1600, '4h');
    const parts = romeParts(due);
    expect(parts.weekday).toBe(1);
    expect(parts.hour).toBe(12);
    const { svc, store } = harness();
    await svc.applyCall(call({ conversationId: 'due' }), friday1600);
    store.callbacks[0].backupProfileId = CALLBACK_TEAM_QUEUE_ID;
    store.callbacks[0].dueAt = new Date('2026-06-01T08:00:00.000Z').toISOString();
    const n = await svc.sweepOverdue(new Date('2026-06-08T10:00:00.000Z'));
    expect(n).toBe(2);
    const again = await svc.sweepOverdue(new Date('2026-06-08T12:00:00.000Z'));
    expect(again).toBe(0);
  });

  it('keeps caller copy free of banned mediation, credit and price terms', () => {
    for (const language of CALLBACK_LANGUAGES) {
      for (const text of allCallbackCopy(language)) {
        expect(scanCallbackCopy(language, text), `${language}: ${text}`).toEqual([]);
      }
    }
  });
});

describe('no mediation path and no transcript column', () => {
  it('does not call routeLead, financing or Banks4All from this module', () => {
    const dir = join(__dirname);
    const files = readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'));
    const source = files.map((f) => readFileSync(join(dir, f), 'utf8')).join('\n');
    expect(source).not.toMatch(/routeLead|financing_needed|Banks4All|partners\.service|b4a/i);
    const sql = readFileSync(join(__dirname, '../../../../migration/sql/0081_voice_callbacks.sql'), 'utf8');
    expect(sql).not.toMatch(/\baudio\b|recording|full_audio/);
    expect(sql).not.toMatch(/transcript(?!_summary)/);
    const parsed = parseVoiceEvent(payload());
    expect(parsed.kind).toBe('call');
    expect(JSON.stringify(parsed)).not.toContain('SECRET TRANSCRIPT');
    expect(parsed.kind === 'call' ? parsed.call : null).not.toHaveProperty('lotNumber');
    expect(parsed.kind === 'call' ? parsed.call : null).not.toHaveProperty('debtorName');
  });
});
