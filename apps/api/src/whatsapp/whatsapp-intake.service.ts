import { BadGatewayException, Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional, ServiceUnavailableException } from '@nestjs/common';
import { and, desc, eq, gte, isNotNull, isNull, sql } from 'drizzle-orm';
import { callReasonLabel, parseCallBookingReason } from '@easycasa/shared';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import { CRM_REPOSITORY, type CrmRepository } from '../crm/domain/ports';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { waCallRequests, waContacts, waInboundMessages, waIntakeLeads, waThreadOutbound } from '../db/schema';
import { EmailService } from '../email/email.service';
import { waHandleFor } from './wa-handle';
import { WhatsAppCloudClient } from './whatsapp-cloud.client';
import { WhatsAppClaudeClient } from './whatsapp-claude.client';
import { WhatsAppJourneyService } from './whatsapp-journey.service';
import { LEAD_LINK_WINDOW_MS, PARTIAL_AFTER_MS, corpus, questionIds, text } from './intake/corpus';
import { reminderDue, workingMinutes } from './intake/rules';
import { parseTranslation, translateSystem, translateUser, type TranslateDirection } from './intake/translate-assist';
import { consultantBotAction, reduceIntake, type IntakeSession, type InboundTurn, type Outbound } from './intake/machine';
import { parseSummary, summaryUserMessage, SUMMARY_SYSTEM, type SummaryInput } from './intake/summary';

const SWEEP_MS = 15 * 60 * 1000;
const MEDIA_TYPES = new Set(['image', 'audio', 'video', 'document', 'sticker']);

function toE164(waId: string): string {
  return `+${waId.replace(/^\+/, '').trim()}`;
}

function readSession(raw: unknown): IntakeSession | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as IntakeSession;
  if (typeof row.lastCustomerAt !== 'string' || !row.answers || typeof row.answers !== 'object') return null;
  return {
    locale: row.locale ?? null,
    route: row.route ?? null,
    cursor: typeof row.cursor === 'number' ? row.cursor : -1,
    answers: row.answers,
    media: Array.isArray(row.media) ? row.media : [],
    mediaNoticeSent: Boolean(row.mediaNoticeSent),
    disclosureSentAt: row.disclosureSentAt ?? null,
    lastCustomerAt: row.lastCustomerAt,
  };
}

function turnFromRow(row: typeof waInboundMessages.$inferSelect): InboundTurn {
  const at = row.receivedAt.toISOString();
  if (MEDIA_TYPES.has(row.messageType)) {
    return { kind: 'media', mediaType: row.messageType, at };
  }
  if (row.messageType === 'interactive' || row.messageType === 'button') {
    const match = row.body ? /\bid:\s*([a-z0-9_]+)/i.exec(row.body) : null;
    return { kind: 'interactive', interactiveId: match?.[1] ?? null, text: row.body, at };
  }
  return { kind: 'text', text: row.body, at };
}

function stageIds(route: string): string[] {
  const ids: string[] = [];
  for (const id of questionIds(route)) {
    const spec = corpus.questions[id as keyof typeof corpus.questions] as { type: string; rows?: string[]; buttons?: string[] } | undefined;
    if (spec && (spec.type === 'list' || spec.type === 'buttons')) {
      ids.push(...(spec.rows ?? []), ...(spec.buttons ?? []));
    }
  }
  return ids;
}

@Injectable()
export class WhatsAppIntakeService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(WhatsAppIntakeService.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    @InjectConfig() private readonly config: ApiConfig,
    private readonly cloud: WhatsAppCloudClient,
    private readonly claude: WhatsAppClaudeClient,
    private readonly email: EmailService,
    private readonly journey: WhatsAppJourneyService,
    @Optional() @Inject(CRM_REPOSITORY) private readonly crm?: CrmRepository,
  ) {}

  onModuleInit(): void {
    if (!this.config.WA_INTAKE_ENABLED && !this.config.WA_CALL_REQUESTS_ENABLED) return;
    this.timer = setInterval(() => {
      void this.sweepPartial().catch((err: unknown) => {
        this.log.warn(`intake partial sweep failed: ${err instanceof Error ? err.message : 'unknown'}`);
      });
      void this.sweepCallReminders().catch((err: unknown) => {
        this.log.warn(`call reminder sweep failed: ${err instanceof Error ? err.message : 'unknown'}`);
      });
      void this.sweepLeadAlerts().catch((err: unknown) => {
        this.log.warn(`lead alert sweep failed: ${err instanceof Error ? err.message : 'unknown'}`);
      });
    }, SWEEP_MS);
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async handleInboundRow(id: string): Promise<void> {
    const rows = await this.db.select().from(waInboundMessages).where(eq(waInboundMessages.id, id)).limit(1);
    const row = rows[0];
    if (!row) return;
    const contact = await this.ensureContact(row);
    if (contact.blockedAt || contact.contactType === 'client') return;

    if (this.config.WA_CONSULTANT_REPLY_ENABLED && contact.consultantRepliedAt) {
      const turn = turnFromRow(row);
      const action = consultantBotAction(true, turn);
      if (action === 'silent') return;
      if (action === 'media') {
        const locale = (corpus.locales as readonly string[]).includes(contact.language ?? '') ? contact.language! : 'en';
        await this.sendAll(row.waId, [{ type: 'text', body: text(locale, 'intake.media_refused') }]);
        return;
      }
    }

    let session = readSession(contact.intakeState);
    if (session && row.receivedAt.getTime() - Date.parse(session.lastCustomerAt) >= PARTIAL_AFTER_MS) {
      await this.writeLead(contact.waId, session, 'partial', null);
      session = null;
    }
    const result = reduceIntake(session, turnFromRow(row));
    const send = await this.sendAll(row.waId, result.outbound);
    if (!send.ok) {
      this.log.warn(`intake send failed id=${row.id} reason=${send.reason}`);
      return;
    }
    if (result.handoff && result.session.route && result.session.locale) {
      await this.writeLead(row.waId, result.session, 'complete', result.handoff.contactPref);
      await this.saveSession(row.waId, null);
    } else {
      await this.saveSession(row.waId, result.session);
    }
    await this.audit(row, result.outbound, send.messageId);
  }

  async sweepPartial(now = new Date()): Promise<number> {
    const rows = await this.db.select().from(waContacts).where(isNotNull(waContacts.intakeState));
    let n = 0;
    for (const contact of rows) {
      const session = readSession(contact.intakeState);
      if (!session?.route || !session.locale) continue;
      if (now.getTime() - Date.parse(session.lastCustomerAt) < PARTIAL_AFTER_MS) continue;
      await this.writeLead(contact.waId, session, 'partial', null);
      await this.saveSession(contact.waId, null);
      this.notifyLinkOnly();
      n += 1;
    }
    return n;
  }

  private async ensureContact(row: typeof waInboundMessages.$inferSelect) {
    const context = await this.journey.contactContext(row.waId);
    const existing = await this.db.select().from(waContacts).where(eq(waContacts.waId, row.waId)).limit(1);
    const handle = row.waHandle ?? waHandleFor(row.waId, this.config.WA_HANDLE_SECRET);
    if (!existing[0]) {
      const [created] = await this.db
        .insert(waContacts)
        .values({
          waId: row.waId,
          waHandle: handle,
          lastInboundAt: row.receivedAt,
          contactType: context.contactType,
          matchedUserId: context.userId,
          updatedAt: new Date(),
        })
        .returning();
      return created!;
    }
    const [updated] = await this.db
      .update(waContacts)
      .set({
        lastInboundAt: row.receivedAt,
        waHandle: existing[0].waHandle ?? handle,
        contactType: context.contactType,
        matchedUserId: context.userId ?? existing[0].matchedUserId,
        updatedAt: new Date(),
      })
      .where(eq(waContacts.waId, row.waId))
      .returning();
    return updated ?? existing[0];
  }

  private async saveSession(waId: string, session: IntakeSession | null): Promise<void> {
    await this.db.update(waContacts).set({ intakeState: session, updatedAt: new Date() }).where(eq(waContacts.waId, waId));
  }

  private async sendAll(waId: string, messages: Outbound[]): Promise<{ ok: boolean; reason?: string; messageId: string | null }> {
    const to = toE164(waId);
    let messageId: string | null = null;
    for (const message of messages) {
      const sent = message.type === 'text'
        ? await this.cloud.sendText(to, message.body)
        : message.type === 'buttons'
          ? await this.cloud.sendInteractiveButtons(to, message.body, message.buttons)
          : await this.cloud.sendInteractiveList(to, message.body, message.button, message.rows);
      if (!sent.ok) return { ok: false, reason: sent.reason, messageId };
      messageId = sent.messageId ?? messageId;
    }
    return { ok: true, messageId };
  }

  private async audit(row: typeof waInboundMessages.$inferSelect, messages: Outbound[], messageId: string | null): Promise<void> {
    if (messages.length === 0) return;
    const body = messages.map((message) => message.body).join('\n---\n');
    try {
      await this.db.update(waInboundMessages).set({ autoRepliedAt: new Date() }).where(eq(waInboundMessages.id, row.id));
      await this.db.insert(waThreadOutbound).values({
        waId: row.waId,
        waHandle: row.waHandle ?? waHandleFor(row.waId, this.config.WA_HANDLE_SECRET),
        providerMessageId: messageId,
        body,
        source: 'intake',
        actorUserId: null,
        sentAt: new Date(),
      });
    } catch (err) {
      this.log.warn(`intake audit insert failed id=${row.id}: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  }

  private async writeLead(
    waId: string,
    session: IntakeSession,
    status: 'complete' | 'partial',
    contactPref: 'call' | 'write' | null,
  ): Promise<void> {
    if (!session.route || !session.locale) return;
    const since = new Date(Date.now() - LEAD_LINK_WINDOW_MS);
    const previous = await this.db
      .select()
      .from(waIntakeLeads)
      .where(and(eq(waIntakeLeads.waId, waId), gte(waIntakeLeads.createdAt, since)))
      .orderBy(desc(waIntakeLeads.createdAt))
      .limit(1);
    const values = {
      venture: 'easycasa',
      product: session.route === 'route_auction' ? 'easy_legenda' : 'easy_casa',
      route: session.route,
      locale: session.locale,
      answers: session.answers,
      media: session.media,
      intakeStatus: status,
      contactPref,
      bookingRequestId: null,
      bookingStatus: contactPref === 'call' ? 'request_until_confirmed' : null,
      disclosureSentAt: session.disclosureSentAt ? new Date(session.disclosureSentAt) : null,
      summaryStatus: this.config.WA_INTAKE_SUMMARY_ENABLED ? 'pending' : 'skipped',
      updatedAt: new Date(),
    };
    const leadId = previous[0]
      ? previous[0].id
      : (await this.db.insert(waIntakeLeads).values({ waId, ...values }).returning({ id: waIntakeLeads.id }))[0]?.id;
    if (previous[0]) {
      await this.db.update(waIntakeLeads).set(values).where(eq(waIntakeLeads.id, previous[0].id));
    }
    if (leadId && contactPref === 'call' && this.config.WA_CALL_REQUESTS_ENABLED) {
      await this.openCallRequest(leadId, waId, session);
    }
    if (!leadId || !this.config.WA_INTAKE_SUMMARY_ENABLED) return;
    await this.writeSummary(leadId, {
      route: session.route,
      locale: session.locale,
      answers: session.answers,
      stageIds: stageIds(session.route),
    });
  }

  private async writeSummary(leadId: string, input: SummaryInput): Promise<void> {
    try {
      const result = await this.claude.complete(SUMMARY_SYSTEM, summaryUserMessage(input), 1200);
      const summary = result.ok ? parseSummary(result.text, input.stageIds) : null;
      await this.db
        .update(waIntakeLeads)
        .set(summary ? { summary, summaryStatus: 'ready', updatedAt: new Date() } : { summaryStatus: 'failed', updatedAt: new Date() })
        .where(eq(waIntakeLeads.id, leadId));
    } catch (err) {
      this.log.warn(`intake summary failed: ${err instanceof Error ? err.message : 'unknown'}`);
      await this.db.update(waIntakeLeads).set({ summaryStatus: 'failed', updatedAt: new Date() }).where(eq(waIntakeLeads.id, leadId));
    }
  }

  private async openCallRequest(leadId: string, waId: string, session: IntakeSession): Promise<void> {
    const preference = session.answers['close.call_time'] ?? null;
    const reason = parseCallBookingReason(
      session.route === 'route_sell' ? 'sell' : session.route === 'route_auction' ? 'easy-legenda' : session.route === 'route_buy' ? 'buy' : 'other',
    );
    let crmContactId: string | null = null;
    let crmTaskId: string | null = null;
    if (this.crm) {
      try {
        const phone = toE164(waId);
        let contact = await this.crm.findContactByPhone(phone);
        if (!contact) {
          const named = session.answers['close.name'];
          const locale = session.locale === 'en' || session.locale === 'es' || session.locale === 'it' ? session.locale : 'en';
          contact = await this.crm.createContact({
            fullName: named && named !== 'skip' ? named : 'WhatsApp',
            phone,
            locale,
            source: 'whatsapp',
          });
        }
        crmContactId = contact.id;
        const task = await this.crm.createTask({
          contactId: contact.id,
          title: `Call · WhatsApp · ${reason ? callReasonLabel(reason, 'en') : 'Other'}`,
          dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        crmTaskId = task.id;
        await this.db.update(waIntakeLeads).set({ crmContactId, updatedAt: new Date() }).where(eq(waIntakeLeads.id, leadId));
      } catch (err) {
        this.log.warn(`call request CRM link failed: ${err instanceof Error ? err.message : 'unknown'}`);
      }
    }
    await this.db.insert(waCallRequests).values({
      leadId,
      crmTaskId,
      customerPreference: preference,
      durationMin: 15,
      callLanguage: 'it',
      status: 'requested',
    });
  }

  /** Consultant writes in Italian or English, reads the customer locale, and sends it themselves. */
  async translateAssist(text: string, locale: string, direction: TranslateDirection = 'to_customer') {
    if (!this.config.WA_TRANSLATE_ASSIST_ENABLED) {
      throw new ServiceUnavailableException('translate assist is off');
    }
    const result = await this.claude.complete(translateSystem(direction, locale), translateUser(text), 800);
    if (!result.ok) throw new BadGatewayException('translate failed');
    const translation = parseTranslation(result.text);
    if (!translation) throw new BadGatewayException('translate failed');
    return { translation, machineTranslated: true as const, locale };
  }

  /** One reminder, two hours before a confirmed slot. Uses the intake interval, not a new scheduler. */
  async sweepCallReminders(now = new Date()): Promise<number> {
    if (!this.config.WA_CALL_REQUESTS_ENABLED) return 0;
    const rows = await this.db
      .select()
      .from(waCallRequests)
      .where(and(eq(waCallRequests.status, 'confirmed'), isNull(waCallRequests.reminderSentAt)));
    let n = 0;
    for (const row of rows) {
      if (!reminderDue({ status: row.status, slot: row.requestedSlot, reminderSentAt: row.reminderSentAt, now })) continue;
      const [lead] = await this.db.select().from(waIntakeLeads).where(eq(waIntakeLeads.id, row.leadId)).limit(1);
      if (!lead) continue;
      // No locale is approved until AZM submits the templates. Do not consume the single reminder.
      this.log.log(`call reminder held until ec_call_reminder is approved lead=${lead.id} locale=${lead.locale}`);
      n += 1;
    }
    return n;
  }

  async sweepLeadAlerts(now = new Date()): Promise<number> {
    const recipients = this.config.WA_LEAD_ALERT_RECIPIENTS.split(',').map((item) => item.trim()).filter(Boolean);
    if (recipients.length === 0) return 0;
    const leads = await this.db.select().from(waIntakeLeads).where(sql`${waIntakeLeads.status} in ('new', 'assigned')`);
    let n = 0;
    for (const lead of leads) {
      const link = `${this.config.ADMIN_PUBLIC_URL.replace(/\/$/, '')}/#whatsapp/leads/${lead.id}`;
      if (lead.status === 'new' && !lead.assignAlertedAt && workingMinutes(lead.createdAt, now) >= this.config.WA_LEAD_ASSIGN_ALERT_MIN) {
        await this.db.update(waIntakeLeads).set({ assignAlertedAt: now }).where(eq(waIntakeLeads.id, lead.id));
        for (const to of recipients) void this.email.sendText(to, 'WhatsApp lead unassigned', `Open the lead:\n${link}\n`);
        n += 1;
      }
      const assignedAt = lead.assignedAt;
      if (
        lead.status === 'assigned' &&
        !lead.contactedAt &&
        !lead.windowAlertedAt &&
        assignedAt &&
        now.getTime() - assignedAt.getTime() >= this.config.WA_LEAD_WINDOW_ALERT_H * 60 * 60 * 1000
      ) {
        await this.db.update(waIntakeLeads).set({ windowAlertedAt: now }).where(eq(waIntakeLeads.id, lead.id));
        for (const to of recipients) void this.email.sendText(to, 'WhatsApp lead not contacted', `Open the lead:\n${link}\n`);
        n += 1;
      }
    }
    return n;
  }

  /** Link only. The message body never leaves the admin viewer. */
  private notifyLinkOnly(): void {
    const to = this.config.WHATSAPP_INBOUND_OPS_EMAIL.trim() || this.config.AGENCY_PUBLIC_EMAIL;
    const link = `${this.config.ADMIN_PUBLIC_URL.replace(/\/$/, '')}/#whatsapp`;
    void this.email.sendText(to, '1 WhatsApp intake is ready', `Open the conversation in the admin viewer:\n${link}\n`).catch((err: unknown) => {
      this.log.warn(`intake notify failed: ${err instanceof Error ? err.message : 'unknown'}`);
    });
  }
}
