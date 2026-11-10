import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, eq, gte, inArray, isNull } from 'drizzle-orm';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { users, waAlertAudit, waAlertRoster, waAlertSent, waContacts, waIntakeLeads } from '../db/schema';
import { EmailService } from '../email/email.service';
import { auctionDateSet, planLeadAlerts, type AlertLead, type DutyWindow } from './intake/lead-alerts';
import { WaPresenceService } from './wa-presence';

const DAY_MS = 24 * 60 * 60 * 1000;
const MEASURE_DAYS = 30;

type RosterInput = {
  role: 'primary' | 'backup' | 'owner';
  days: number[];
  startMin: number;
  endMin: number;
  email: string;
  waPhone?: string | null;
  active: boolean;
};

@Injectable()
export class WhatsAppLeadAlertService {
  private readonly log = new Logger(WhatsAppLeadAlertService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    @InjectConfig() private readonly config: ApiConfig,
    private readonly email: EmailService,
    private readonly presence: WaPresenceService,
  ) {}

  async sweep(now = new Date()): Promise<number> {
    if (!this.config.WA_LEAD_ALERTS_ENABLED) return 0;
    const stored = await this.db.select().from(waAlertRoster).where(eq(waAlertRoster.active, true));
    const fallback = this.fallbackEmails();
    const roster: DutyWindow[] = stored.length
      ? stored.map((row) => ({
          userId: row.userId,
          role: row.role as DutyWindow['role'],
          days: row.days,
          startMin: row.startMin,
          endMin: row.endMin,
          active: row.active,
        }))
      : fallback.map((_, index) => ({
          userId: `fallback:${index}`,
          role: 'primary' as const,
          days: [1, 2, 3, 4, 5],
          startMin: 9 * 60,
          endMin: 18 * 60,
          active: true,
        }));
    if (roster.length === 0) return 0;

    const leads = await this.db
      .select()
      .from(waIntakeLeads)
      .where(inArray(waIntakeLeads.status, ['new', 'assigned']));
    const sentRows = await this.db.select().from(waAlertSent);
    const sent = new Set(sentRows.map((row) => `${row.leadId}:${row.step}`));
    const views: AlertLead[] = [];
    for (const lead of leads) {
      const [contact] = await this.db
        .select({ lastInboundAt: waContacts.lastInboundAt })
        .from(waContacts)
        .where(eq(waContacts.waId, lead.waId))
        .limit(1);
      const expires = contact?.lastInboundAt ? contact.lastInboundAt.getTime() + DAY_MS : null;
      views.push({
        id: lead.id,
        status: lead.status as AlertLead['status'],
        product: lead.product,
        route: lead.route,
        locale: lead.locale,
        createdAt: lead.createdAt,
        assignedAt: lead.assignedAt,
        ownerUserId: lead.ownerUserId,
        openedAt: lead.openedAt,
        contactedAt: lead.contactedAt,
        windowRemainingMs: expires == null ? null : expires - now.getTime(),
        auctionDateSet: auctionDateSet(lead.route, lead.answers),
      });
    }

    const actions = planLeadAlerts({
      now,
      roster,
      onlineUserIds: this.presence.online(now.getTime()),
      leads: views,
      sent,
      linkFor: (id) => this.link(id),
    });
    let n = 0;
    for (const action of actions) {
      const delivered = await this.deliver(action, stored, fallback, now);
      if (delivered) n += 1;
    }
    return n;
  }

  async coverage(now = new Date()) {
    const rows = await this.db.select().from(waAlertRoster);
    const active = rows.filter((row) => row.active).length;
    const enabled = this.config.WA_LEAD_ALERTS_ENABLED;
    return {
      enabled,
      nobodyReceives: enabled && active === 0 && this.fallbackEmails().length === 0,
      rosterCount: active,
      measures: await this.measures(now),
    };
  }

  async listRoster() {
    const rows = await this.db.select().from(waAlertRoster);
    return {
      items: rows.map((row) => ({
        userId: row.userId,
        role: row.role,
        days: row.days,
        startMin: row.startMin,
        endMin: row.endMin,
        email: row.email,
        waPhone: row.waPhone,
        active: row.active,
      })),
    };
  }

  async saveRoster(userId: string, input: RosterInput) {
    const days = [...new Set(input.days)].sort((a, b) => a - b);
    if (days.length === 0 || days.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) {
      throw new BadRequestException('days must be 1 (Monday) through 7 (Sunday)');
    }
    if (!Number.isInteger(input.startMin) || !Number.isInteger(input.endMin) || input.startMin < 0 || input.endMin > 1440 || input.endMin <= input.startMin) {
      throw new BadRequestException('hours must be inside one day');
    }
    const email = input.email.trim();
    if (!email.includes('@') || /[\r\n]/.test(email)) throw new BadRequestException('email is not usable');
    const waPhone = input.waPhone?.trim() || null;
    if (waPhone && !/^\+?[0-9 ]{8,20}$/.test(waPhone)) throw new BadRequestException('WhatsApp number is not usable');
    const [user] = await this.db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new NotFoundException('User not found');
    await this.db
      .insert(waAlertRoster)
      .values({
        userId,
        role: input.role,
        days,
        startMin: input.startMin,
        endMin: input.endMin,
        email,
        waPhone,
        active: input.active,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: waAlertRoster.userId,
        set: {
          role: input.role,
          days,
          startMin: input.startMin,
          endMin: input.endMin,
          email,
          waPhone,
          active: input.active,
          updatedAt: new Date(),
        },
      });
    return { userId };
  }

  async removeRoster(userId: string) {
    await this.db.delete(waAlertRoster).where(eq(waAlertRoster.userId, userId));
    return { userId };
  }

  private async measures(now: Date) {
    const since = new Date(now.getTime() - MEASURE_DAYS * DAY_MS);
    const leads = await this.db.select().from(waIntakeLeads).where(gte(waIntakeLeads.createdAt, since));
    if (leads.length === 0) {
      return { meanAssignMin: null, meanFirstReplyMin: null, answeredInsideWindowPct: null, alertsPerLead: null };
    }
    const contacts = await this.db
      .select({ waId: waContacts.waId, lastInboundAt: waContacts.lastInboundAt })
      .from(waContacts)
      .where(inArray(waContacts.waId, [...new Set(leads.map((lead) => lead.waId))]));
    const inbound = new Map(contacts.map((contact) => [contact.waId, contact.lastInboundAt]));
    let assignSum = 0;
    let assignN = 0;
    let replySum = 0;
    let replyN = 0;
    let inside = 0;
    for (const lead of leads) {
      if (lead.assignedAt) {
        assignSum += (lead.assignedAt.getTime() - lead.createdAt.getTime()) / 60_000;
        assignN += 1;
      }
      if (lead.contactedAt) {
        replySum += (lead.contactedAt.getTime() - lead.createdAt.getTime()) / 60_000;
        replyN += 1;
        const last = inbound.get(lead.waId);
        if (last && lead.contactedAt.getTime() < last.getTime() + DAY_MS) inside += 1;
      }
    }
    const sent = await this.db
      .select({ leadId: waAlertSent.leadId })
      .from(waAlertSent)
      .where(inArray(waAlertSent.leadId, leads.map((lead) => lead.id)));
    const alertsPerLead = sent.length / leads.length;
    return {
      meanAssignMin: assignN ? Math.round(assignSum / assignN) : null,
      meanFirstReplyMin: replyN ? Math.round(replySum / replyN) : null,
      answeredInsideWindowPct: Math.round((inside / leads.length) * 100),
      alertsPerLead: Math.round(alertsPerLead * 10) / 10,
    };
  }

  private async deliver(
    action: { step: string; channel: 'in_app' | 'email' | 'digest'; leadIds: string[]; userIds: string[]; subject: string; body: string },
    stored: Array<{ userId: string; email: string }>,
    fallback: string[],
    now: Date,
  ): Promise<boolean> {
    if (action.userIds.some((id) => id.startsWith('fallback:'))) {
      const unseen: string[] = [];
      for (const leadId of action.leadIds) {
        if (!(await this.audited(leadId, action.step, null))) unseen.push(leadId);
      }
      if (unseen.length === 0) {
        for (const leadId of action.leadIds) await this.markSent(leadId, action.step, now);
        return true;
      }
      let ok = true;
      for (const userId of action.userIds) {
        const to = fallback[Number(userId.slice('fallback:'.length))];
        if (!to) {
          ok = false;
          continue;
        }
        const result = await this.email.sendText(to, action.subject, action.body);
        if (!result.delivered) {
          ok = false;
          this.log.warn(`lead alert not delivered step=${action.step}`);
        }
      }
      if (!ok) return false;
      for (const leadId of action.leadIds) {
        await this.audit(leadId, action.step, action.channel, null, now);
        await this.markSent(leadId, action.step, now);
      }
      return true;
    }

    if (action.channel === 'in_app') {
      for (const leadId of action.leadIds) {
        this.presence.push(action.userIds, {
          leadId,
          step: action.step,
          subject: action.subject,
          href: this.link(leadId),
        });
        for (const userId of action.userIds) {
          await this.audit(leadId, action.step, 'in_app', userId, now);
        }
        await this.markSent(leadId, action.step, now);
      }
      return true;
    }

    let ok = true;
    for (const userId of action.userIds) {
      const recipient = userId.startsWith('fallback:') ? null : userId;
      const pending = [];
      for (const leadId of action.leadIds) {
        if (!(await this.audited(leadId, action.step, recipient))) pending.push(leadId);
      }
      if (pending.length === 0) continue;
      const to = userId.startsWith('fallback:')
        ? fallback[Number(userId.slice('fallback:'.length))]
        : stored.find((row) => row.userId === userId)?.email;
      if (!to) {
        ok = false;
        continue;
      }
      const result = await this.email.sendText(to, action.subject, action.body);
      if (!result.delivered) {
        ok = false;
        this.log.warn(`lead alert not delivered step=${action.step}`);
        continue;
      }
      for (const leadId of action.leadIds) {
        await this.audit(leadId, action.step, action.channel, recipient, now);
      }
    }
    if (!ok) return false;
    for (const leadId of action.leadIds) await this.markSent(leadId, action.step, now);
    return true;
  }

  private async audited(leadId: string, step: string, recipientUserId: string | null): Promise<boolean> {
    const rows = await this.db
      .select({ id: waAlertAudit.id })
      .from(waAlertAudit)
      .where(
        and(
          eq(waAlertAudit.leadId, leadId),
          eq(waAlertAudit.step, step),
          recipientUserId ? eq(waAlertAudit.recipientUserId, recipientUserId) : isNull(waAlertAudit.recipientUserId),
        ),
      )
      .limit(1);
    return Boolean(rows[0]);
  }

  private async audit(leadId: string, step: string, channel: string, recipientUserId: string | null, now: Date): Promise<void> {
    if (await this.audited(leadId, step, recipientUserId)) return;
    await this.db.insert(waAlertAudit).values({ leadId, step, channel, recipientUserId, sentAt: now });
  }

  private async markSent(leadId: string, step: string, now: Date): Promise<void> {
    await this.db.insert(waAlertSent).values({ leadId, step, sentAt: now }).onConflictDoNothing();
  }

  private link(id: string): string {
    return `${this.config.ADMIN_PUBLIC_URL.replace(/\/$/, '')}/#whatsapp/leads/${id}`;
  }

  private fallbackEmails(): string[] {
    return this.config.WA_LEAD_ALERT_RECIPIENTS.split(',').map((item) => item.trim()).filter(Boolean);
  }
}
