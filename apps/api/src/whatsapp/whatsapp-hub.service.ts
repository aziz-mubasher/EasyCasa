import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';

import { parseWaOperatorLocale } from '@easycasa/shared';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { waCannedReplies, waInboundMessages } from '../db/schema';
import { whatsappInboundSignatureRejected } from '../observability/metrics';
import { WhatsAppCloudClient } from './whatsapp-cloud.client';
import { WhatsAppMessagesStore } from './whatsapp-messages.store';

/**
 * K EC 7.4 — API Hub (same WhatsApp module, operator console).
 * Meta never calls the Hub. Staff call /admin/whatsapp/hub/*.
 */
@Injectable()
export class WhatsAppHubService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly cloud: WhatsAppCloudClient,
    private readonly messages: WhatsAppMessagesStore,
    @InjectConfig() private readonly config: ApiConfig,
  ) {}

  async connectionStatus() {
    const last = await this.db
      .select({ receivedAt: waInboundMessages.receivedAt })
      .from(waInboundMessages)
      .orderBy(desc(waInboundMessages.receivedAt))
      .limit(1);

    const rejected = await counterValue(whatsappInboundSignatureRejected);
    const phoneId = this.config.WHATSAPP_PHONE_NUMBER_ID.trim();

    return {
      provider: 'meta_cloud',
      graphVersion: this.config.WHATSAPP_GRAPH_VERSION,
      configured: this.cloud.configured,
      demoMode: this.config.DEMO_MODE === true,
      tokenSet: Boolean(this.config.WHATSAPP_TOKEN.trim()),
      phoneNumberIdSet: Boolean(phoneId),
      phoneNumberIdLast4: phoneId ? phoneId.slice(-4) : null,
      appSecretSet: Boolean(this.config.WHATSAPP_APP_SECRET.trim()),
      verifyTokenSet: Boolean(this.config.WHATSAPP_VERIFY_TOKEN.trim()),
      handleSecretSet: Boolean(this.config.WA_HANDLE_SECRET.trim()),
      publicWebhookPath: '/whatsapp/webhook',
      publicWebhookStatusPath: '/whatsapp/webhook/status',
      businessNumber: this.config.WHATSAPP_BUSINESS_NUMBER.trim() || null,
      publicSiteUrl: this.config.WHATSAPP_PUBLIC_SITE_URL,
      lastInboundAt: last[0]?.receivedAt?.toISOString() ?? null,
      signatureRejectedTotal: rejected,
      ownWaba: true,
      notes: [
        'EasyCasa uses its own WABA and phone — do not share Banks4All’s portfolio.',
        'Session text inside 24h; utility templates outside 24h. No marketing templates.',
        'API Hub is this admin console, not a second Meta callback.',
      ],
    };
  }

  templatesCatalog() {
    const rows: Array<{ key: string; name: string; configured: boolean; kind: 'authentication' | 'utility' }> =
      [
        {
          key: 'otp',
          name: this.config.WHATSAPP_OTP_TEMPLATE,
          configured: Boolean(this.config.WHATSAPP_OTP_TEMPLATE.trim()),
          kind: 'authentication',
        },
        {
          key: 'viewing_reminder_24h',
          name: this.config.WHATSAPP_VIEWING_REMINDER_24H_TEMPLATE,
          configured: Boolean(this.config.WHATSAPP_VIEWING_REMINDER_24H_TEMPLATE.trim()),
          kind: 'utility',
        },
        {
          key: 'viewing_reminder_2h',
          name: this.config.WHATSAPP_VIEWING_REMINDER_2H_TEMPLATE,
          configured: Boolean(this.config.WHATSAPP_VIEWING_REMINDER_2H_TEMPLATE.trim()),
          kind: 'utility',
        },
        {
          key: 'viewing_requested',
          name: this.config.WHATSAPP_VIEWING_REQUESTED_TEMPLATE,
          configured: Boolean(this.config.WHATSAPP_VIEWING_REQUESTED_TEMPLATE.trim()),
          kind: 'utility',
        },
        {
          key: 'viewing_confirmed',
          name: this.config.WHATSAPP_VIEWING_CONFIRMED_TEMPLATE,
          configured: Boolean(this.config.WHATSAPP_VIEWING_CONFIRMED_TEMPLATE.trim()),
          kind: 'utility',
        },
        {
          key: 'viewing_cancelled',
          name: this.config.WHATSAPP_VIEWING_CANCELLED_TEMPLATE,
          configured: Boolean(this.config.WHATSAPP_VIEWING_CANCELLED_TEMPLATE.trim()),
          kind: 'utility',
        },
        {
          key: 'enquiry_received',
          name: this.config.WHATSAPP_ENQUIRY_RECEIVED_TEMPLATE,
          configured: Boolean(this.config.WHATSAPP_ENQUIRY_RECEIVED_TEMPLATE.trim()),
          kind: 'utility',
        },
      ];
    return {
      localeDefault: this.config.WHATSAPP_OTP_TEMPLATE_LANG,
      sessionVsTemplate:
        'Inside the 24h customer-care window, send session text / buttons / lists. Outside the window, only an approved utility or auth template will deliver.',
      marketingTemplates: false,
      items: rows,
    };
  }

  analytics(days = 90) {
    return this.messages.measurementSummary(days);
  }

  async listCanned() {
    const rows = await this.db
      .select()
      .from(waCannedReplies)
      .orderBy(desc(waCannedReplies.updatedAt));
    return {
      items: rows.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        locale: r.locale,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    };
  }

  async createCanned(input: { title: string; body: string; locale?: string }) {
    const locale = parseWaOperatorLocale(input.locale);
    const [row] = await this.db
      .insert(waCannedReplies)
      .values({
        title: input.title.trim(),
        body: input.body.trim(),
        locale,
      })
      .returning();
    return {
      id: row!.id,
      title: row!.title,
      body: row!.body,
      locale: row!.locale,
      createdAt: row!.createdAt.toISOString(),
      updatedAt: row!.updatedAt.toISOString(),
    };
  }

  async deleteCanned(id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(waCannedReplies)
      .where(eq(waCannedReplies.id, id))
      .returning({ id: waCannedReplies.id });
    return deleted.length > 0;
  }
}

async function counterValue(counter: { get: () => Promise<{ values: Array<{ value: number }> }> }): Promise<number> {
  const metric = await counter.get();
  return metric.values.reduce((sum, v) => sum + v.value, 0);
}
