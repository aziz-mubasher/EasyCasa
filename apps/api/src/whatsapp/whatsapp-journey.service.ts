import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import { crmFireSafe } from '../crm/crm-fire-safe';
import { CRM_HOOKS, CRM_REPOSITORY, type CrmHooks, type CrmRepository } from '../crm/domain/ports';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { listings, users, viewings, waContacts, waInboundMessages, waThreadOutbound } from '../db/schema';
import {
  whatsappAutoReplySent,
  whatsappAutoReplySuppressed,
} from '../observability/metrics';
import { waHandleFor } from './wa-handle';
import { WhatsAppCloudClient, type WhatsAppSendResult } from './whatsapp-cloud.client';
import {
  decideJourneyAction,
  isJourneyLocale,
  JOURNEY_LEGENDA_URL,
  journeyCopy,
  parseLanguageReplyId,
  type JourneyAction,
  type JourneyState,
  type JourneyStep,
} from './whatsapp-journey';
import { toE164 } from './whatsapp-inbound.service';

/**
 * K EC 7.4 — first-contact journey after persist.
 * Stops after language / welcome / three EC buttons. No Assist / Consult / FAQ.
 */
@Injectable()
export class WhatsAppJourneyService {
  private readonly log = new Logger(WhatsAppJourneyService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly cloud: WhatsAppCloudClient,
    @InjectConfig() private readonly config: ApiConfig,
    @Optional() @Inject(CRM_HOOKS) private readonly crmHooks?: CrmHooks,
    @Optional() @Inject(CRM_REPOSITORY) private readonly crmRepo?: CrmRepository,
  ) {}

  /**
   * Every inbound lead — including STOP / closed-window / blocked — upserts CRM.
   * Journey auto-replies stay in handleInboundRow.
   */
  async recordInboundLead(id: string): Promise<void> {
    const rows = await this.db
      .select()
      .from(waInboundMessages)
      .where(eq(waInboundMessages.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return;

    const contact = await this.upsertContact(row);
    const interactiveReplyId = parseStoredInteractiveId(row.body, row.messageType);
    const pickedLocale = parseLanguageReplyId(interactiveReplyId);
    const localeForCrm = pickedLocale ?? (isJourneyLocale(contact.language) ? contact.language : null);
    const hooks = this.crmHooks;
    await crmFireSafe(
      'onWhatsAppInbound',
      hooks
        ? () =>
            hooks.onWhatsAppInbound({
              waId: row.waId,
              contactName: row.contactName,
              locale: localeForCrm,
              bodyPreview: row.body,
              matchedUserId: contact.matchedUserId,
            })
        : undefined,
    );
    if (this.crmRepo) {
      const linked = await this.crmRepo.findContactByPhone(toE164(row.waId));
      if (linked) await this.linkCrmContact(row.waId, linked.id);
    }
  }

  async handleInboundRow(id: string): Promise<void> {
    const rows = await this.db
      .select()
      .from(waInboundMessages)
      .where(eq(waInboundMessages.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return;

    const contact = await this.upsertContact(row);
    if (contact.blockedAt) {
      whatsappAutoReplySuppressed.inc({ reason: 'blocked' });
      return;
    }

    const interactiveReplyId = parseStoredInteractiveId(row.body, row.messageType);
    const action = decideJourneyAction(toState(contact), {
      text: row.body,
      interactiveId: interactiveReplyId,
      receivedAt: row.receivedAt,
    });

    if (action.type === 'none') {
      whatsappAutoReplySuppressed.inc({ reason: action.reason });
      await this.touchInbound(contact.waId, row.receivedAt);
      return;
    }

    const send = await this.dispatch(row.waId, action);
    if (!send.ok) {
      whatsappAutoReplySuppressed.inc({ reason: 'send_failed' });
      this.log.warn(`journey send failed id=${row.id} reason=${send.reason}`);
      return;
    }

    const sentAt = new Date();
    await this.db
      .update(waInboundMessages)
      .set({ autoRepliedAt: sentAt })
      .where(eq(waInboundMessages.id, row.id));
    await this.db.insert(waThreadOutbound).values({
      waId: row.waId,
      waHandle: row.waHandle ?? waHandleFor(row.waId, this.config.WA_HANDLE_SECRET),
      providerMessageId: send.messageId,
      body: outboundBody(action, this.config.WHATSAPP_PUBLIC_SITE_URL),
      source: 'journey',
      actorUserId: null,
      sentAt,
    });
    await this.applyActionState(contact.waId, action, row.receivedAt);
    whatsappAutoReplySent.inc();
    this.log.log(`journey sent id=${row.id} action=${action.type}`);
  }

  private async upsertContact(row: typeof waInboundMessages.$inferSelect) {
    const existing = await this.db
      .select()
      .from(waContacts)
      .where(eq(waContacts.waId, row.waId))
      .limit(1);
    const match = await this.matchPortalUser(row.waId);
    const contactType = match.isClient ? 'client' : (existing[0]?.contactType ?? 'lead');
    const handle = row.waHandle ?? waHandleFor(row.waId, this.config.WA_HANDLE_SECRET);

    if (!existing[0]) {
      const [created] = await this.db
        .insert(waContacts)
        .values({
          waId: row.waId,
          waHandle: handle,
          lastInboundAt: row.receivedAt,
          contactType,
          matchedUserId: match.userId,
          updatedAt: new Date(),
        })
        .returning();
      return created!;
    }

    const [updated] = await this.db
      .update(waContacts)
      .set({
        waHandle: existing[0].waHandle ?? handle,
        lastInboundAt: row.receivedAt,
        contactType,
        matchedUserId: match.userId ?? existing[0].matchedUserId,
        updatedAt: new Date(),
      })
      .where(eq(waContacts.waId, row.waId))
      .returning();
    return updated ?? existing[0];
  }

  private async matchPortalUser(waId: string): Promise<{ userId: string | null; isClient: boolean }> {
    const digits = waId.replace(/\D/g, '');
    if (!digits) return { userId: null, isClient: false };
    const user = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.phoneE164, digits))
      .limit(1);
    const userId = user[0]?.id ?? null;
    if (!userId) return { userId: null, isClient: false };

    const owned = await this.db
      .select({ id: listings.id })
      .from(listings)
      .where(eq(listings.ownerUserId, userId))
      .limit(1);
    if (owned.length) return { userId, isClient: true };

    const seen = await this.db
      .select({ id: viewings.id })
      .from(viewings)
      .where(eq(viewings.seekerUserId, userId))
      .limit(1);
    return { userId, isClient: seen.length > 0 };
  }

  private async dispatch(waId: string, action: JourneyAction): Promise<WhatsAppSendResult> {
    const to = toE164(waId);
    const site = this.config.WHATSAPP_PUBLIC_SITE_URL.replace(/\/$/, '');

    if (action.type === 'language_list' || action.type === 'language_nudge') {
      const copy = journeyCopy('it');
      const body =
        action.type === 'language_nudge' ? copy.languageNudge : copy.languageListBody;
      return this.cloud.sendInteractiveList(to, body, copy.languageListButton, copy.languages);
    }

    if (action.type === 'welcome') {
      const copy = journeyCopy(action.locale);
      const body = action.offHours ? copy.offHours : copy.welcome;
      return this.cloud.sendInteractiveButtons(to, body, copy.buttons);
    }

    if (action.type === 'buy_property') {
      return this.cloud.sendText(to, journeyCopy(action.locale).buyProperty);
    }
    if (action.type === 'sell_property') {
      return this.cloud.sendText(to, journeyCopy(action.locale).sellProperty);
    }
    if (action.type === 'easy_legenda') {
      const copy = journeyCopy(action.locale);
      return this.cloud.sendCtaUrl(to, copy.easyLegenda, copy.buttons[2]!.title, JOURNEY_LEGENDA_URL);
    }
    if (action.type === 'book_viewing') {
      return this.cloud.sendText(to, journeyCopy(action.locale).bookViewing);
    }
    if (action.type === 'search_brief') {
      return this.cloud.sendText(to, journeyCopy(action.locale).searchBrief);
    }
    if (action.type === 'open_listings') {
      const copy = journeyCopy(action.locale);
      return this.cloud.sendCtaUrl(to, copy.openListings, 'EasyCasa', site);
    }
    if (action.type === 'save_brief') {
      return this.cloud.sendText(to, journeyCopy(action.locale).briefThanks);
    }
    return { ok: false, reason: 'not_configured' };
  }

  private async applyActionState(waId: string, action: JourneyAction, receivedAt: Date): Promise<void> {
    const patch: Partial<typeof waContacts.$inferInsert> = {
      lastInboundAt: receivedAt,
      updatedAt: new Date(),
    };

    if (action.type === 'language_list' || action.type === 'language_nudge') {
      patch.lastLanguagePromptAt = receivedAt;
      patch.journeyStep = 'language';
      if (action.type === 'language_list') {
        patch.lastCasualPromptAt = receivedAt;
      }
    }
    if (action.type === 'welcome') {
      patch.language = action.locale;
      patch.greetingSentAt = receivedAt;
      patch.journeyStep = 'greeted';
    }
    if (action.type === 'buy_property') patch.journeyStep = 'book_viewing';
    if (action.type === 'sell_property') patch.journeyStep = 'greeted';
    if (action.type === 'easy_legenda') patch.journeyStep = 'open_listings';
    if (action.type === 'book_viewing') patch.journeyStep = 'book_viewing';
    if (action.type === 'search_brief') patch.journeyStep = 'search_brief';
    if (action.type === 'open_listings') patch.journeyStep = 'open_listings';
    if (action.type === 'save_brief') {
      patch.journeyStep = 'brief_received';
      patch.language = action.locale;
    }

    await this.db.update(waContacts).set(patch).where(eq(waContacts.waId, waId));

    if (action.type === 'save_brief') {
      const hooks = this.crmHooks;
      await crmFireSafe(
        'onWhatsAppSearchBrief',
        hooks
          ? () =>
              hooks.onWhatsAppSearchBrief({
                waId,
                locale: action.locale,
                searchPreference: action.text,
              })
          : undefined,
      );
    }
  }

  private async touchInbound(waId: string, receivedAt: Date): Promise<void> {
    await this.db
      .update(waContacts)
      .set({ lastInboundAt: receivedAt, updatedAt: new Date() })
      .where(eq(waContacts.waId, waId));
  }

  async setBlocked(waId: string, blocked: boolean): Promise<Date | null> {
    const blockedAt = blocked ? new Date() : null;
    await this.db
      .update(waContacts)
      .set({ blockedAt, updatedAt: new Date() })
      .where(eq(waContacts.waId, waId));
    return blockedAt;
  }

  async getByWaId(waId: string) {
    const rows = await this.db.select().from(waContacts).where(eq(waContacts.waId, waId)).limit(1);
    return rows[0] ?? null;
  }

  /** Form-filled CRM name when linked; otherwise null. */
  async crmFormName(waId: string): Promise<string | null> {
    if (!this.crmRepo) return null;
    const local = await this.getByWaId(waId);
    const byId = local?.crmContactId ? await this.crmRepo.findContactById(local.crmContactId) : null;
    const byPhone = byId ?? (await this.crmRepo.findContactByPhone(toE164(waId)));
    const name = byPhone?.fullName?.trim() || null;
    return name;
  }

  async linkCrmContact(waId: string, crmContactId: string | null): Promise<void> {
    await this.db
      .update(waContacts)
      .set({ crmContactId, updatedAt: new Date() })
      .where(eq(waContacts.waId, waId));
  }
}

function toState(row: typeof waContacts.$inferSelect): JourneyState {
  return {
    language: isJourneyLocale(row.language) ? row.language : null,
    greetingSentAt: row.greetingSentAt,
    lastLanguagePromptAt: row.lastLanguagePromptAt,
    lastInboundAt: row.lastInboundAt,
    lastCasualPromptAt: row.lastCasualPromptAt,
    journeyStep: (row.journeyStep as JourneyStep) || 'none',
    contactType: row.contactType === 'client' ? 'client' : 'lead',
    blockedAt: row.blockedAt,
  };
}

function outboundBody(action: JourneyAction, siteUrl: string): string {
  if (action.type === 'language_list') return journeyCopy('it').languageListBody;
  if (action.type === 'language_nudge') return journeyCopy('it').languageNudge;
  if (action.type === 'welcome') {
    const copy = journeyCopy(action.locale);
    return action.offHours ? copy.offHours : copy.welcome;
  }
  if (action.type === 'buy_property') return journeyCopy(action.locale).buyProperty;
  if (action.type === 'sell_property') return journeyCopy(action.locale).sellProperty;
  if (action.type === 'easy_legenda') {
    return `${journeyCopy(action.locale).easyLegenda} ${JOURNEY_LEGENDA_URL}`;
  }
  if (action.type === 'book_viewing') return journeyCopy(action.locale).bookViewing;
  if (action.type === 'search_brief') return journeyCopy(action.locale).searchBrief;
  if (action.type === 'open_listings') {
    return `${journeyCopy(action.locale).openListings} ${siteUrl}`;
  }
  if (action.type === 'save_brief') return journeyCopy(action.locale).briefThanks;
  return action.type;
}

/** Recover button/list id from stored body (`id: book_viewing`) when webhook re-processes. */
function parseStoredInteractiveId(body: string | null, messageType: string): string | null {
  if (!body) return null;
  if (messageType !== 'interactive' && messageType !== 'button') {
    // Free text may still carry a leftover `id:` from media captions — ignore.
    return null;
  }
  const m = /\bid:\s*([a-z0-9_]+)/i.exec(body);
  return m?.[1] ?? null;
}

