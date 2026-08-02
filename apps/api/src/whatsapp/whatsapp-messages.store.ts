import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, gte, inArray, isNotNull, sql } from 'drizzle-orm';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { viewings, whatsappMessages } from '../db/schema';
import type { WhatsAppSendResult } from './whatsapp-cloud.client';

export type WhatsAppRelatedType = 'viewing' | 'enquiry' | 'otp';

export type WhatsAppSendMeta = {
  toUserId?: string | null;
  relatedType?: WhatsAppRelatedType | null;
  relatedId?: string | null;
  locale?: string;
};

/**
 * EC-16 — persist Cloud send/status without storing message body content.
 */
@Injectable()
export class WhatsAppMessagesStore {
  private readonly log = new Logger(WhatsAppMessagesStore.name);

  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async recordSendAttempt(input: {
    templateName: string;
    locale: string;
    meta?: WhatsAppSendMeta;
    result: WhatsAppSendResult;
  }): Promise<void> {
    try {
      const status = input.result.ok ? 'sent' : 'failed';
      const failureReason = input.result.ok
        ? null
        : [input.result.reason, input.result.message].filter(Boolean).join(': ');
      await this.db.insert(whatsappMessages).values({
        providerMessageId: input.result.ok ? input.result.messageId : null,
        templateName: input.templateName,
        locale: input.locale,
        toUserId: input.meta?.toUserId ?? null,
        relatedType: input.meta?.relatedType ?? null,
        relatedId: input.meta?.relatedId ?? null,
        status,
        failureReason,
        statusUpdatedAt: new Date(),
      });
    } catch (err) {
      this.log.warn(
        `whatsapp_messages insert failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async applyStatusUpdate(providerMessageId: string, status: string, failureReason?: string): Promise<void> {
    try {
      await this.db
        .update(whatsappMessages)
        .set({
          status,
          failureReason: failureReason ?? null,
          statusUpdatedAt: new Date(),
        })
        .where(eq(whatsappMessages.providerMessageId, providerMessageId));
    } catch (err) {
      this.log.warn(
        `whatsapp_messages status update failed id=${providerMessageId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** Ops measurement: reminder delivery vs viewing no-show (raw counts, not significance). */
  async measurementSummary(days = 90): Promise<{
    periodDays: number;
    viewingsInPeriod: number;
    reminderRows: number;
    reminderDeliveredRecipients: number;
    reminderDeliveryRate: number | null;
    noShowWithDeliveredReminder: number;
    noShowWithoutDeliveredReminder: number;
    completedWithDeliveredReminder: number;
    completedWithoutDeliveredReminder: number;
    failureRateByTemplate: Array<{ templateName: string; total: number; failed: number; failureRate: number }>;
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const reminderTemplates = [
      'easycasa_viewing_reminder_24h',
      'easycasa_viewing_reminder_2h',
    ];

    const [viewingCount] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(viewings)
      .where(gte(viewings.createdAt, since));

    const reminderRows = await this.db
      .select({
        relatedId: whatsappMessages.relatedId,
        status: whatsappMessages.status,
        templateName: whatsappMessages.templateName,
      })
      .from(whatsappMessages)
      .where(
        and(
          eq(whatsappMessages.relatedType, 'viewing'),
          gte(whatsappMessages.sentAt, since),
          inArray(whatsappMessages.templateName, reminderTemplates),
          isNotNull(whatsappMessages.relatedId),
        ),
      );

    const deliveredViewingIds = new Set(
      reminderRows
        .filter((r) => r.status === 'delivered' || r.status === 'read')
        .map((r) => r.relatedId!)
        .filter(Boolean),
    );

    const periodViewings = await this.db
      .select({ id: viewings.id, status: viewings.status })
      .from(viewings)
      .where(gte(viewings.createdAt, since));

    let noShowWith = 0;
    let noShowWithout = 0;
    let completedWith = 0;
    let completedWithout = 0;
    for (const v of periodViewings) {
      const had = deliveredViewingIds.has(v.id);
      if (v.status === 'NO_SHOW') {
        if (had) noShowWith += 1;
        else noShowWithout += 1;
      } else if (v.status === 'COMPLETED') {
        if (had) completedWith += 1;
        else completedWithout += 1;
      }
    }

    const failAgg = await this.db
      .select({
        templateName: whatsappMessages.templateName,
        total: sql<number>`count(*)::int`,
        failed: sql<number>`sum(case when ${whatsappMessages.status} = 'failed' then 1 else 0 end)::int`,
      })
      .from(whatsappMessages)
      .where(gte(whatsappMessages.sentAt, since))
      .groupBy(whatsappMessages.templateName);

    const deliveredN = reminderRows.filter(
      (r) => r.status === 'delivered' || r.status === 'read',
    ).length;

    return {
      periodDays: days,
      viewingsInPeriod: viewingCount?.n ?? 0,
      reminderRows: reminderRows.length,
      reminderDeliveredRecipients: deliveredN,
      reminderDeliveryRate: reminderRows.length
        ? deliveredN / reminderRows.length
        : null,
      noShowWithDeliveredReminder: noShowWith,
      noShowWithoutDeliveredReminder: noShowWithout,
      completedWithDeliveredReminder: completedWith,
      completedWithoutDeliveredReminder: completedWithout,
      failureRateByTemplate: failAgg.map((r) => ({
        templateName: r.templateName,
        total: r.total,
        failed: r.failed,
        failureRate: r.total ? r.failed / r.total : 0,
      })),
    };
  }
}
