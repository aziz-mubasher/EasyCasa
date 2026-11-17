import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CALLBACK_LOG_RETENTION,
  CALLBACK_TEAM_QUEUE_ID,
  EASY_CASA_VOICE_E164,
  callbackAckMessage,
  callbackConfirmMessage,
  callbackOwnerAlert,
  crmLocaleForCallback,
  lineLabel,
  normalizeCallbackLanguage,
  roleLabel,
  topicToLine,
  type CallbackLanguage,
  type CallbackLine,
  type CallbackRole,
  type CallbackTopic,
} from '@easycasa/shared';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import { CRM_REPOSITORY, type CrmRepository } from '../crm/domain/ports';
import { EMAIL_PORT, type EmailPort } from '../email/email-port';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import type { CallbacksStore, StoredCallback, StoredProfile, StoredRoute } from './callbacks.types';
import { CALLBACKS_STORE } from './callbacks.tokens';
import { parseVoiceEvent, type ParsedVoiceCall } from './parse-event';
import { verifyElevenLabsSignature } from './signature';
import { romeSlotLabel, suggestSlots, type AvailProfile, type SuggestedSlot } from './slots';
import { dueAtFrom } from './working-hours';

export type IngestResult = { ok: true; ignored?: boolean; duplicate?: boolean; callbackId?: string };

@Injectable()
export class CallbacksService {
  private readonly log = new Logger(CallbacksService.name);

  constructor(
    @Inject(CALLBACKS_STORE) private readonly store: CallbacksStore,
    @Inject(CRM_REPOSITORY) private readonly crm: CrmRepository,
    private readonly whatsapp: WhatsAppService,
    @Inject(EMAIL_PORT) private readonly email: EmailPort,
    @InjectConfig() private readonly config: ApiConfig,
  ) {}

  retentionNote(): string {
    return CALLBACK_LOG_RETENTION;
  }

  mappedNumbers(): string[] {
    const raw = this.config.VOICE_CALLBACK_NUMBERS || EASY_CASA_VOICE_E164;
    return raw
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
      .map((n) => (n.startsWith('+') ? n : `+${n.replace(/\D/g, '')}`));
  }

  async ingest(rawBody: string, signature: string | undefined, now = new Date()): Promise<IngestResult> {
    const secret = this.config.ELEVENLABS_WEBHOOK_SECRET.trim();
    if (!verifyElevenLabsSignature(rawBody, signature, secret, now.getTime())) {
      throw new ForbiddenException('invalid webhook signature');
    }
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw new BadRequestException('invalid json');
    }
    const parsed = parseVoiceEvent(body);
    if (parsed.kind === 'ignore') {
      this.log.log(`voice webhook ignored (${parsed.reason})`);
      return { ok: true, ignored: true };
    }
    const called = parsed.call.calledNumber;
    if (!called || !this.mappedNumbers().includes(called)) {
      this.log.log(`voice webhook ignored number ${called ?? 'missing'}`);
      return { ok: true, ignored: true };
    }
    return this.applyCall(parsed.call, now);
  }

  async applyCall(call: ParsedVoiceCall, now = new Date()): Promise<IngestResult> {
    const called = call.calledNumber ?? '';
    const { row, created } = await this.store.insertCall({
      conversationId: call.conversationId,
      calledNumber: called,
      callerNumber: call.callerNumber,
      contactId: null,
      callerName: call.callerName,
      callbackPhone: call.callbackPhone,
      callbackRequested: call.callbackRequested,
      preferredCallbackTime: call.preferredCallbackTime,
      language: normalizeCallbackLanguage(call.language),
      topic: call.topic,
      callerRole: call.callerRole,
      summary: call.summary,
      title: call.title,
      durationSecs: call.durationSecs,
      evaluations: call.evaluations,
      elevenlabsUrl: `https://elevenlabs.io/app/conversational-ai/history/${call.conversationId}`,
    });
    const phone = call.callbackPhone ?? call.callerNumber;
    let contactId = row.contactId;
    if (!contactId) {
      contactId = await this.linkContact(call, phone);
      if (contactId) await this.store.updateCallContact(row.id, contactId);
    }
    if (created && contactId && this.config.CRM_ENABLED) {
      await this.crm.addActivity({
        contactId,
        type: 'call',
        body: call.summary.slice(0, 500) || call.title || 'WhatsApp voice call',
        refTable: 'crm.voice_calls',
        refId: row.id,
      });
    }

    if (!call.callbackRequested) return { ok: true, duplicate: !created };
    if (!created) {
      const existing = await this.store.findCallbackByConversation(call.conversationId);
      if (existing) return { ok: true, duplicate: true };
    }

    const route = await this.resolveRoute(called, call.language, topicToLine(call.topic));
    const due = dueAtFrom(now, route.confirmWithin);
    const callback = await this.store.insertCallback({
      contactId,
      voiceCallId: row.id,
      conversationId: call.conversationId,
      calledNumber: called,
      callbackLanguage: normalizeCallbackLanguage(call.language),
      topic: call.topic,
      callerRole: call.callerRole,
      callerWords: call.preferredCallbackTime,
      ownerProfileId: route.forwardProfileId,
      backupProfileId: route.backupProfileId,
      dueAt: due.toISOString(),
      status: 'requested',
    });
    await this.store.addEvent(callback.id, null, 'requested', {
      ownerProfileId: route.forwardProfileId,
      dueAt: due.toISOString(),
    });
    const suggestions = await this.suggestionsFor(callback, now);
    await this.store.updateCallback(callback.id, { suggestedSlots: suggestions });
    try {
      await this.notifyNew(callback, call, route);
      await this.sendCallerAck(phone, call.language, callback.id);
    } catch (err) {
      this.log.warn(`callback notify failed: ${String(err)}`);
    }
    return { ok: true, callbackId: callback.id };
  }

  private async linkContact(call: ParsedVoiceCall, phone: string | null): Promise<string | null> {
    if (!this.config.CRM_ENABLED || !phone) return null;
    const existing = await this.crm.findContactByPhone(phone);
    if (existing) return existing.id;
    const name = call.callerName.trim() || 'Unknown';
    const created = await this.crm.createContact({
      fullName: name,
      phone,
      locale: crmLocaleForCallback(call.language),
      source: 'whatsapp_voice',
    });
    await this.crm.upsertSeeker(created.id, { stage: 'new_enquiry', searchIntent: { channel: 'whatsapp_voice' } });
    return created.id;
  }

  async resolveRoute(calledNumber: string, language: CallbackLanguage, line: CallbackLine): Promise<StoredRoute> {
    const rows = await this.store.routes(calledNumber);
    const exact = rows.find((r) => r.language === language && r.line === line);
    const any = rows.find((r) => r.language === language && r.line == null);
    const hit = exact ?? any;
    if (hit) return hit;
    return {
      id: 'fallback',
      calledNumber,
      language,
      line: null,
      forwardProfileId: CALLBACK_TEAM_QUEUE_ID,
      backupProfileId: null,
      confirmWithin: '4h',
      alertWhatsapp: false,
      alertEmail: true,
      offerRealSlots: false,
    };
  }

  private asAvail(p: StoredProfile): AvailProfile {
    return {
      id: p.id,
      name: p.name,
      callbackMin: p.callbackMin,
      gapMin: p.gapMin,
      maxPerDay: p.maxPerDay,
      earliestMin: p.earliestMin,
      weekly: p.weekly,
      timeOff: p.timeOff,
    };
  }

  async suggestionsFor(row: StoredCallback, now = new Date()): Promise<SuggestedSlot[]> {
    const owner = await this.store.getProfile(row.ownerProfileId);
    if (!owner) return [];
    const backup = row.backupProfileId ? await this.store.getProfile(row.backupProfileId) : null;
    const busy = await this.store.busy(now.toISOString(), new Date(now.getTime() + 21 * 86_400_000).toISOString());
    return suggestSlots({
      owner: this.asAvail(owner),
      backup: backup ? this.asAvail(backup) : null,
      busy,
      words: row.callerWords,
      now,
    });
  }

  async summary(now = new Date()) {
    const rows = await this.store.listCallbacks();
    const start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);
    const waiting = rows.filter((r) => r.status === 'requested' || r.status === 'held');
    const overdue = waiting.filter((r) => r.dueAt < now.toISOString());
    const profiles = await this.store.profiles();
    const teamIds = new Set(profiles.filter((p) => p.kind === 'team_queue').map((p) => p.id));
    const noOwner = waiting.filter((r) => teamIds.has(r.ownerProfileId));
    const oldest = waiting.reduce<string | null>((acc, r) => (acc == null || r.createdAt < acc ? r.createdAt : acc), null);
    return {
      callsToday: await this.store.countCallsSince(start.toISOString()),
      waiting: waiting.length,
      oldestWaitingAt: oldest,
      overdue: overdue.length,
      noOwner: noOwner.length,
      retention: CALLBACK_LOG_RETENTION,
    };
  }

  async inbox(filter: {
    chip?: string;
    ownerId?: string;
    line?: string;
    role?: string;
    now?: Date;
  }) {
    const now = filter.now ?? new Date();
    const profiles = await this.store.profiles();
    const teamIds = new Set(profiles.filter((p) => p.kind === 'team_queue').map((p) => p.id));
    let rows = await this.store.listCallbacks();
    const counts = {
      requested: rows.filter((r) => r.status === 'requested').length,
      held: rows.filter((r) => r.status === 'held').length,
      overdue: rows.filter((r) => (r.status === 'requested' || r.status === 'held') && r.dueAt < now.toISOString()).length,
      noOwner: rows.filter((r) => (r.status === 'requested' || r.status === 'held') && teamIds.has(r.ownerProfileId)).length,
      confirmed: rows.filter((r) => r.status === 'confirmed').length,
      all: rows.length,
    };
    if (filter.chip === 'requested') rows = rows.filter((r) => r.status === 'requested');
    else if (filter.chip === 'held') rows = rows.filter((r) => r.status === 'held');
    else if (filter.chip === 'overdue') {
      rows = rows.filter((r) => (r.status === 'requested' || r.status === 'held') && r.dueAt < now.toISOString());
    } else if (filter.chip === 'no_owner') {
      rows = rows.filter((r) => (r.status === 'requested' || r.status === 'held') && teamIds.has(r.ownerProfileId));
    } else if (filter.chip === 'confirmed') rows = rows.filter((r) => r.status === 'confirmed');
    if (filter.ownerId) rows = rows.filter((r) => r.ownerProfileId === filter.ownerId);
    if (filter.line) rows = rows.filter((r) => topicToLine(r.topic as CallbackTopic) === filter.line);
    if (filter.role) rows = rows.filter((r) => r.callerRole === filter.role);
    rows.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
    const calls = await this.store.listCalls(1, 500);
    const byConv = new Map(calls.items.map((c) => [c.conversationId, c]));
    return {
      counts,
      items: rows.map((r) => this.queueItem(r, byConv.get(r.conversationId)?.callerName ?? '', now, teamIds)),
    };
  }

  private queueItem(row: StoredCallback, name: string, now: Date, teamIds: Set<string>) {
    const due = new Date(row.dueAt).getTime();
    const deltaH = Math.round((due - now.getTime()) / 3_600_000);
    const overdue = (row.status === 'requested' || row.status === 'held') && due < now.getTime();
    return {
      id: row.id,
      name: name.trim() || 'Unknown',
      language: row.callbackLanguage,
      line: topicToLine(row.topic as CallbackTopic),
      role: row.callerRole,
      words: row.callerWords,
      status: row.status,
      overdue,
      noOwner: teamIds.has(row.ownerProfileId),
      deadlineLabel: overdue
        ? `Overdue by ${Math.max(1, Math.abs(deltaH))} h`
        : `Confirm within ${Math.max(0, deltaH)} h`,
      dueAt: row.dueAt,
    };
  }

  async conversationId(id: string): Promise<string> {
    const row = await this.store.getCallback(id);
    if (!row) throw new NotFoundException('callback not found');
    return row.conversationId;
  }

  /** Stream the ElevenLabs recording to a superadmin. Nothing is written to disk or the database. */
  async pipeRecording(conversationId: string, res: import('express').Response): Promise<void> {
    const key = this.config.ELEVENLABS_API_KEY.trim();
    if (!key) {
      res.status(503).json({ error: 'listening is not configured' });
      return;
    }
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(conversationId)}/audio`,
      { headers: { 'xi-api-key': key } },
    );
    if (!upstream.ok || !upstream.body) {
      res.status(502).json({ error: 'recording unavailable' });
      return;
    }
    res.status(200);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg');
    res.setHeader('Cache-Control', 'private, no-store');
    Readable.fromWeb(upstream.body as WebReadableStream).pipe(res);
  }

  async detail(id: string, opts: { elevenLabs: boolean; canListen: boolean }, now = new Date()) {
    const row = await this.store.getCallback(id);
    if (!row) throw new NotFoundException('callback not found');
    const call = await this.store.findCall(row.conversationId);
    const suggestions = await this.suggestionsFor(row, now);
    await this.store.updateCallback(id, { suggestedSlots: suggestions });
    const owner = await this.store.getProfile(row.ownerProfileId);
    const backup = row.backupProfileId ? await this.store.getProfile(row.backupProfileId) : null;
    const lang = normalizeCallbackLanguage(row.callbackLanguage);
    const previewSlot = suggestions[0];
    const when = previewSlot ? romeSlotLabel(previewSlot.start) : '…';
    return {
      id: row.id,
      name: call?.callerName?.trim() || 'Unknown',
      phone: call?.callbackPhone ?? call?.callerNumber ?? '',
      language: lang,
      line: topicToLine(row.topic as CallbackTopic),
      lineLabel: lineLabel(topicToLine(row.topic as CallbackTopic)),
      role: row.callerRole as CallbackRole,
      roleLabel: roleLabel(row.callerRole as CallbackRole),
      words: row.callerWords,
      status: row.status,
      dueAt: row.dueAt,
      ownerName: owner?.name ?? 'Team',
      backupName: backup?.name ?? null,
      suggestions,
      preview: callbackConfirmMessage(lang, when),
      ackPreview: callbackAckMessage(lang),
      canListen: opts.canListen,
      call: call
        ? {
            summary: call.summary,
            title: call.title,
            durationSecs: call.durationSecs,
            evaluations: call.evaluations,
            elevenlabsUrl: opts.elevenLabs ? call.elevenlabsUrl : null,
          }
        : null,
      events: await this.store.listEvents(id),
      retention: CALLBACK_LOG_RETENTION,
    };
  }

  async confirm(id: string, actorId: string, slotStart: string, override: boolean, now = new Date()) {
    const row = await this.store.getCallback(id);
    if (!row) throw new NotFoundException('callback not found');
    if (row.status !== 'requested' && row.status !== 'held') {
      throw new BadRequestException('callback is not waiting');
    }
    const suggestions = await this.suggestionsFor(row, now);
    const match = suggestions.find((s) => s.start === new Date(slotStart).toISOString());
    if (!match && !override) {
      await this.store.updateCallback(id, { suggestedSlots: suggestions });
      throw new ConflictException('slot taken');
    }
    const profileId = match?.profileId ?? row.ownerProfileId;
    const profile = await this.store.getProfile(profileId);
    if (!profile) throw new BadRequestException('owner missing');
    const start = new Date(slotStart);
    const end = new Date(start.getTime() + profile.callbackMin * 60_000);
    const booked = await this.store.bookIfFree({
      profileId,
      callbackId: id,
      start,
      end,
      gapMin: profile.gapMin,
    });
    if ('conflict' in booked) {
      const fresh = await this.suggestionsFor(row, now);
      await this.store.updateCallback(id, { suggestedSlots: fresh });
      throw new ConflictException('slot taken');
    }
    await this.store.updateCallback(id, {
      status: 'confirmed',
      confirmedStart: start.toISOString(),
      confirmedEnd: end.toISOString(),
      bookingId: booked.bookingId,
      suggestedSlots: suggestions,
    });
    const call = await this.store.findCall(row.conversationId);
    const lang = normalizeCallbackLanguage(row.callbackLanguage);
    const when = romeSlotLabel(start.toISOString());
    const text = callbackConfirmMessage(lang, when);
    const phone = call?.callbackPhone ?? call?.callerNumber ?? null;
    const sent = await this.sendCallerText(phone, lang, text, this.config.WHATSAPP_CALLBACK_CONFIRM_TEMPLATE);
    await this.store.addEvent(id, actorId, 'confirmed', {
      slotStart: start.toISOString(),
      bookingId: booked.bookingId,
      whatsapp: sent,
      override,
    });
    return { ok: true, bookingId: booked.bookingId, suggestions };
  }

  async reassign(id: string, actorId: string, ownerProfileId: string) {
    const row = await this.store.getCallback(id);
    if (!row) throw new NotFoundException('callback not found');
    const profile = await this.store.getProfile(ownerProfileId);
    if (!profile) throw new BadRequestException('profile missing');
    await this.store.updateCallback(id, { ownerProfileId });
    await this.store.addEvent(id, actorId, 'reassigned', { ownerProfileId });
    return { ok: true };
  }

  async setStatus(id: string, actorId: string, status: 'no_answer' | 'cancelled' | 'done') {
    const row = await this.store.getCallback(id);
    if (!row) throw new NotFoundException('callback not found');
    await this.store.updateCallback(id, { status });
    await this.store.addEvent(id, actorId, status, {});
    return { ok: true };
  }

  async calls(page: number) {
    const result = await this.store.listCalls(page, 25);
    const callbacks = await this.store.listCallbacks();
    const wanted = new Set(callbacks.map((c) => c.conversationId));
    return {
      total: result.total,
      page,
      items: result.items.map((c) => ({
        id: c.id,
        at: c.createdAt,
        name: c.callerName.trim() || 'Unknown',
        phone: c.callerNumber,
        language: c.language,
        line: topicToLine(c.topic as CallbackTopic),
        role: c.callerRole,
        durationSecs: c.durationSecs,
        outcome: !c.callbackRequested ? (c.durationSecs < 5 ? 'Hung up' : 'Info only') : wanted.has(c.conversationId) ? 'Callback requested' : 'Info only',
      })),
    };
  }

  async routing(calledNumber = EASY_CASA_VOICE_E164) {
    const profiles = await this.store.profiles();
    const routes = await this.store.routes(calledNumber);
    const callbacks = await this.store.listCallbacks();
    const busy = await this.store.busy(new Date().toISOString(), new Date(Date.now() + 14 * 86_400_000).toISOString());
    const people = await Promise.all(
      profiles.map(async (p) => {
        const next = suggestSlots({
          owner: this.asAvail(p),
          backup: null,
          busy,
          words: null,
          now: new Date(),
          limit: 1,
        });
        const open = callbacks.filter(
          (c) => c.ownerProfileId === p.id && (c.status === 'requested' || c.status === 'held'),
        ).length;
        return {
          id: p.id,
          name: p.name,
          kind: p.kind,
          languages: p.languages,
          open,
          nextFree: next[0]?.start ?? null,
        };
      }),
    );
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const calls = await this.store.listCalls(1, 1000);
    return {
      calledNumber,
      teamQueueWarning: routes.some((r) => r.forwardProfileId === CALLBACK_TEAM_QUEUE_ID),
      people,
      routes,
      week: Object.fromEntries(
        routes.map((r) => {
          const n = calls.items.filter((c) => c.language === r.language && c.createdAt >= weekAgo).length;
          const cb = callbacks.filter((c) => c.callbackLanguage === r.language && c.createdAt >= weekAgo).length;
          return [r.language + (r.line ?? ''), { calls: n, callbacks: cb }];
        }),
      ),
    };
  }

  async saveRouting(calledNumber: string, rows: StoredRoute[]) {
    for (const row of rows) {
      if (row.offerRealSlots) row.offerRealSlots = false;
    }
    return this.store.saveRoutes(calledNumber, rows);
  }

  async team() {
    const profiles = await this.store.profiles();
    const busy = await this.store.busy(new Date().toISOString(), new Date(Date.now() + 14 * 86_400_000).toISOString());
    return {
      profiles,
      bookings: busy.map((b) => ({ profileId: b.profileId, start: b.start.toISOString(), end: b.end.toISOString() })),
    };
  }

  async saveProfile(row: StoredProfile) {
    if (row.kind === 'team_queue') {
      row.whatsappE164 = null;
      row.maxPerDay = null;
    }
    return this.store.saveProfile(row);
  }

  async staff(query: string) {
    return this.store.listStaff(query);
  }

  identity() {
    const piva = this.config.EASYCASA_PIVA;
    return {
      denominazione: this.config.EASYCASA_DENOMINAZIONE,
      piva,
      pivaPlaceholder: !piva || piva === 'IT00000000000',
      signOff: 'Easy Casa Italia · Ayni Group Italia',
      retention: CALLBACK_LOG_RETENTION,
    };
  }

  async sweepOverdue(now = new Date()): Promise<number> {
    const rows = await this.store.listCallbacks();
    let n = 0;
    for (const row of rows) {
      if (row.status !== 'requested' && row.status !== 'held') continue;
      if (row.dueAt >= now.toISOString()) continue;
      const call = await this.store.findCall(row.conversationId);
      if (!row.overdueOwnerAt) {
        await this.alertProfile(row.ownerProfileId, row, call?.summary ?? '', 'overdue-owner');
        await this.store.updateCallback(row.id, { overdueOwnerAt: now.toISOString() });
        await this.store.addEvent(row.id, null, 'overdue_owner', {});
        n += 1;
      }
      if (!row.overdueBackupAt && row.backupProfileId) {
        await this.alertProfile(row.backupProfileId, row, call?.summary ?? '', 'overdue-backup');
        await this.store.updateCallback(row.id, { overdueBackupAt: now.toISOString() });
        await this.store.addEvent(row.id, null, 'overdue_backup', {});
        n += 1;
      }
    }
    return n;
  }

  private async notifyNew(row: StoredCallback, call: ParsedVoiceCall, route: StoredRoute) {
    if (!route.alertEmail && !route.alertWhatsapp) return;
    await this.alertProfile(row.ownerProfileId, row, call.summary, 'new', {
      email: route.alertEmail,
      whatsapp: route.alertWhatsapp,
    });
  }

  private async alertProfile(
    profileId: string,
    row: StoredCallback,
    summary: string,
    kind: string,
    flags: { email: boolean; whatsapp: boolean } = { email: true, whatsapp: false },
  ) {
    const profile = await this.store.getProfile(profileId);
    if (!profile) return;
    const call = await this.store.findCall(row.conversationId);
    const alert = callbackOwnerAlert({
      name: call?.callerName || 'Unknown',
      phone: call?.callbackPhone ?? call?.callerNumber ?? '',
      language: normalizeCallbackLanguage(row.callbackLanguage),
      line: lineLabel(topicToLine(row.topic as CallbackTopic)),
      role: roleLabel(row.callerRole as CallbackRole),
      words: row.callerWords,
      summary: summary.split('\n')[0] ?? '',
      link: `${this.config.ADMIN_PUBLIC_URL.replace(/\/$/, '')}/#callbacks/${row.id}`,
    });
    if (flags.email && profile.email) {
      await this.email.send({ to: profile.email, subject: alert.subject, text: alert.text });
    }
    const template = this.config.WHATSAPP_CALLBACK_OWNER_TEMPLATE.trim();
    if (flags.whatsapp && profile.whatsappE164 && template) {
      await this.whatsapp.sendTemplate({
        phoneE164: profile.whatsappE164,
        templateName: template,
        languageCode: 'it',
        bodyParams: [alert.text.slice(0, 900)],
      });
    }
    await this.store.addEvent(row.id, null, `alert_${kind}`, {
      email: Boolean(flags.email && profile.email),
      whatsapp: Boolean(flags.whatsapp && profile.whatsappE164 && template),
    });
  }

  private async sendCallerAck(phone: string | null, language: CallbackLanguage, callbackId: string) {
    const text = callbackAckMessage(language);
    const result = await this.sendCallerText(phone, language, text, this.config.WHATSAPP_CALLBACK_ACK_TEMPLATE);
    await this.store.addEvent(callbackId, null, 'caller_ack', result);
  }

  /**
   * A WhatsApp call does not open Meta's 24-hour customer-care window; that window
   * opens on an inbound message. Utility template when the name is set, otherwise
   * one session-text attempt (works only if the caller already messaged).
   */
  private async sendCallerText(
    phone: string | null,
    language: CallbackLanguage,
    text: string,
    templateName: string,
  ): Promise<Record<string, unknown>> {
    if (!phone) return { ok: false, reason: 'no-phone' };
    const name = templateName.trim();
    if (name) {
      const sent = await this.whatsapp.sendTemplate({
        phoneE164: phone,
        templateName: name,
        languageCode: language === 'pt' ? 'pt_PT' : language,
        bodyParams: [text.slice(0, 900)],
      });
      return { channel: 'template', ...sent };
    }
    const sent = await this.whatsapp.sendText(phone, text);
    return { channel: 'session', window: '24h-only-if-user-messaged', ...sent };
  }
}
