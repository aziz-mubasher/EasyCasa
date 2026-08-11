import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  Module,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, gte, inArray, isNull, lte, ne, sql } from 'drizzle-orm';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { enquiries, listings, viewingAvailability, viewings } from '../db/schema';
import { EmailService } from '../email/email.service';
import { isExpiresOnOrAfterRomeToday } from '../enquiries/banks4all/rome-date';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';
import { ProductAnalyticsService } from '../analytics/product-analytics.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import {
  verifiedPhoneE164,
  formatViewingWhenParts,
  viewingUtilityBodyParams,
  viewingUtilityTemplateName,
} from './viewing-whatsapp';
import type {
  AvailabilityRepository,
  ViewingListingLookup,
  ViewingNotifier,
  ViewingRepository,
} from './domain/ports';
import type { AvailabilityWindow, Slot, Viewing, ViewingStatus } from './domain/types';
import { DEFAULT_LISTING_TIMEZONE } from './domain/zoned-time';
import { buildViewingIcs, viewingIcsUid } from './ics';
import { ViewingsController } from './viewings.controller';
import { SellerViewingsController } from './seller-viewings.controller';
import { SellerViewingsEnabledGuard } from './seller-viewings.guard';
import { SellerOnboardingEnabledGuard } from '../seller/seller-onboarding.guard';
import { ViewingsReminderScheduler } from './viewings-reminder.scheduler';
import {
  AVAILABILITY_REPOSITORY,
  VIEWING_LISTING_LOOKUP,
  VIEWING_NOTIFIER,
  VIEWING_REPOSITORY,
  ViewingsService,
} from './viewings.service';

type ViewingRow = typeof viewings.$inferSelect;

function toViewing(r: ViewingRow): Viewing {
  return {
    id: r.id,
    listingId: r.listingId,
    seekerUserId: r.seekerUserId,
    conductorUserId: r.conductorUserId,
    enquiryId: r.enquiryId,
    startMs: r.startAt.getTime(),
    endMs: r.endAt.getTime(),
    status: r.status as ViewingStatus,
    icsSequence: r.icsSequence ?? 0,
  };
}

function formatWhenLocal(startMs: number, timeZone: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date(startMs));
}

@Injectable()
export class DrizzleAvailabilityRepository implements AvailabilityRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async getWindows(listingId: string): Promise<AvailabilityWindow[]> {
    const rows = await this.db
      .select({
        weekday: viewingAvailability.weekday,
        startMinutes: viewingAvailability.startMinutes,
        endMinutes: viewingAvailability.endMinutes,
        capacity: viewingAvailability.capacity,
      })
      .from(viewingAvailability)
      .where(eq(viewingAvailability.listingId, listingId));
    return rows.map((r) => ({
      weekday: r.weekday,
      startMinutes: r.startMinutes,
      endMinutes: r.endMinutes,
      capacity: r.capacity ?? 1,
    }));
  }

  async setWindows(listingId: string, windows: AvailabilityWindow[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(viewingAvailability).where(eq(viewingAvailability.listingId, listingId));
      if (windows.length === 0) return;
      await tx.insert(viewingAvailability).values(
        windows.map((w) => ({
          listingId,
          weekday: w.weekday,
          startMinutes: w.startMinutes,
          endMinutes: w.endMinutes,
          capacity: w.capacity != null && w.capacity >= 1 ? Math.floor(w.capacity) : 1,
        })),
      );
    });
  }
}

@Injectable()
export class DrizzleViewingRepository implements ViewingRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async activeOccupancy(
    listingId: string,
    excludeViewingId?: string,
  ): Promise<Array<{ startMs: number; endMs: number; status: 'REQUESTED' | 'CONFIRMED' }>> {
    const rows = await this.db
      .select({
        startAt: viewings.startAt,
        endAt: viewings.endAt,
        status: viewings.status,
      })
      .from(viewings)
      .where(
        and(
          eq(viewings.listingId, listingId),
          inArray(viewings.status, ['REQUESTED', 'CONFIRMED']),
          excludeViewingId ? ne(viewings.id, excludeViewingId) : undefined,
        ),
      );
    return rows.map((r) => ({
      startMs: r.startAt.getTime(),
      endMs: r.endAt.getTime(),
      status: r.status as 'REQUESTED' | 'CONFIRMED',
    }));
  }

  async activeSlots(listingId: string, excludeViewingId?: string): Promise<Slot[]> {
    const rows = await this.activeOccupancy(listingId, excludeViewingId);
    return rows.map((r) => ({ startMs: r.startMs, endMs: r.endMs }));
  }

  async countConfirmedAt(
    listingId: string,
    startMs: number,
    excludeViewingId?: string,
  ): Promise<number> {
    const rows = await this.db
      .select({ id: viewings.id })
      .from(viewings)
      .where(
        and(
          eq(viewings.listingId, listingId),
          eq(viewings.startAt, new Date(startMs)),
          eq(viewings.status, 'CONFIRMED'),
          excludeViewingId ? ne(viewings.id, excludeViewingId) : undefined,
        ),
      );
    return rows.length;
  }

  async create(input: {
    listingId: string;
    seekerUserId: string;
    conductorUserId: string;
    enquiryId: string | null;
    startMs: number;
    endMs: number;
  }): Promise<Viewing> {
    try {
      const [r] = await this.db
        .insert(viewings)
        .values({
          listingId: input.listingId,
          seekerUserId: input.seekerUserId,
          conductorUserId: input.conductorUserId,
          enquiryId: input.enquiryId,
          startAt: new Date(input.startMs),
          endAt: new Date(input.endMs),
          status: 'REQUESTED',
        })
        .returning();
      return toViewing(r);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/unique|duplicate/i.test(msg)) {
        throw new ConflictException('Slot no longer available');
      }
      throw err;
    }
  }

  async get(id: string): Promise<Viewing | null> {
    const rows = await this.db.select().from(viewings).where(eq(viewings.id, id)).limit(1);
    return rows[0] ? toViewing(rows[0]) : null;
  }

  async listForSeeker(seekerUserId: string): Promise<Viewing[]> {
    const rows = await this.db
      .select()
      .from(viewings)
      .where(eq(viewings.seekerUserId, seekerUserId))
      .orderBy(asc(viewings.startAt));
    return rows.map(toViewing);
  }

  async listForConductor(conductorUserId: string): Promise<Viewing[]> {
    const rows = await this.db
      .select({
        viewing: viewings,
        b4aBandMaxCents: enquiries.b4aBandMaxCents,
        b4aExpiresAt: enquiries.b4aExpiresAt,
      })
      .from(viewings)
      .leftJoin(enquiries, eq(viewings.enquiryId, enquiries.id))
      .where(eq(viewings.conductorUserId, conductorUserId))
      .orderBy(asc(viewings.startAt));

    return rows.map((r) => {
      const v = toViewing(r.viewing);
      if (r.b4aExpiresAt && isExpiresOnOrAfterRomeToday(r.b4aExpiresAt)) {
        return {
          ...v,
          b4aBandMaxCents: r.b4aBandMaxCents,
          b4aExpiresAt: r.b4aExpiresAt,
        };
      }
      return v;
    });
  }

  async setStatus(id: string, status: ViewingStatus): Promise<void> {
    await this.db
      .update(viewings)
      .set({ status, updatedAt: new Date() })
      .where(eq(viewings.id, id));
  }

  async reschedule(id: string, startMs: number, endMs: number): Promise<Viewing> {
    const [r] = await this.db
      .update(viewings)
      .set({
        startAt: new Date(startMs),
        endAt: new Date(endMs),
        status: 'REQUESTED',
        icsSequence: sql`${viewings.icsSequence} + 1`,
        reminder24hSentAt: null,
        reminder2hSentAt: null,
        updatedAt: new Date(),
      })
      .where(eq(viewings.id, id))
      .returning();
    if (!r) throw new NotFoundException(`Viewing ${id} not found`);
    return toViewing(r);
  }

  async listDueReminders(
    kind: '24h' | '2h',
    windowStartMs: number,
    windowEndMs: number,
  ): Promise<Viewing[]> {
    const reminderCol = kind === '24h' ? viewings.reminder24hSentAt : viewings.reminder2hSentAt;
    const rows = await this.db
      .select()
      .from(viewings)
      .where(
        and(
          eq(viewings.status, 'CONFIRMED'),
          gte(viewings.startAt, new Date(windowStartMs)),
          lte(viewings.startAt, new Date(windowEndMs)),
          isNull(reminderCol),
        ),
      );
    return rows.map(toViewing);
  }

  async markReminderSent(id: string, kind: '24h' | '2h'): Promise<void> {
    const now = new Date();
    await this.db
      .update(viewings)
      .set(
        kind === '24h'
          ? { reminder24hSentAt: now, updatedAt: now }
          : { reminder2hSentAt: now, updatedAt: now },
      )
      .where(eq(viewings.id, id));
  }
}

@Injectable()
export class DrizzleViewingListingLookup implements ViewingListingLookup {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async getConductor(listingIdOrSlug: string): Promise<{
    listingId: string;
    conductorUserId: string;
    ownerUserId: string;
    title: string;
    address: string | null;
    city: string | null;
    province: string | null;
    timezone: string;
  } | null> {
    const byId =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        listingIdOrSlug,
      );
    const rows = await this.db
      .select({
        id: listings.id,
        ownerUserId: listings.ownerUserId,
        mediatorUserId: listings.mediatorUserId,
        agentId: listings.agentId,
        title: listings.title,
        address: listings.address,
        city: listings.city,
        province: listings.province,
        timezone: listings.timezone,
      })
      .from(listings)
      .where(byId ? eq(listings.id, listingIdOrSlug) : eq(listings.slug, listingIdOrSlug))
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    const ownerUserId = r.ownerUserId ?? r.agentId;
    if (!ownerUserId) return null;
    return {
      listingId: r.id,
      conductorUserId: r.mediatorUserId ?? ownerUserId,
      ownerUserId,
      title: r.title,
      address: r.address,
      city: r.city,
      province: r.province,
      timezone: r.timezone || DEFAULT_LISTING_TIMEZONE,
    };
  }
}

@Injectable()
export class DefaultViewingNotifier implements ViewingNotifier {
  private readonly logger = new Logger(DefaultViewingNotifier.name);

  constructor(
    private readonly notifications: NotificationsService,
    private readonly email: EmailService,
    private readonly users: UsersService,
    private readonly whatsapp: WhatsAppService,
    @InjectConfig() private readonly config: ApiConfig,
    @Inject(DRIZZLE) private readonly db: Db,
  ) {}

  async notify(
    userId: string,
    viewing: Viewing,
    kind: 'requested' | 'confirmed' | 'cancelled' | 'reminder24h' | 'reminder2h',
  ): Promise<void> {
    const channels: Array<'in_app' | 'push'> =
      kind === 'reminder2h' ? ['in_app', 'push'] : kind.startsWith('reminder') ? ['in_app'] : ['in_app', 'push'];

    try {
      await this.notifications.notify(
        userId,
        `viewing.${kind}`,
        {
          viewingId: viewing.id,
          listingId: viewing.listingId,
          startMs: viewing.startMs,
          status: viewing.status,
        },
        channels,
      );
    } catch (err) {
      this.logger.warn(
        `viewing notify failed user=${userId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    try {
      if (kind === 'requested') await this.sendRequestedEmail(userId, viewing);
      else if (kind === 'confirmed') await this.sendConfirmedEmail(userId, viewing);
      else if (kind === 'cancelled') await this.sendCancelledEmail(userId, viewing);
      else if (kind === 'reminder24h') await this.sendReminderEmail(userId, viewing, 24);
      else if (kind === 'reminder2h') await this.sendReminderEmail(userId, viewing, 2);
    } catch (err) {
      this.logger.warn(
        `viewing email failed kind=${kind}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    try {
      await this.sendWhatsApp(userId, viewing, kind);
    } catch (err) {
      this.logger.warn(
        `viewing whatsapp failed kind=${kind}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** Fail-soft utility template; skip when Cloud / template / verified phone missing. */
  private async sendWhatsApp(
    userId: string,
    viewing: Viewing,
    kind: 'requested' | 'confirmed' | 'cancelled' | 'reminder24h' | 'reminder2h',
  ): Promise<void> {
    const templateName = viewingUtilityTemplateName(kind, this.config);
    if (!this.whatsapp.configured || !templateName) return;

    const recipient = await this.users.findById(userId);
    const phoneE164 = verifiedPhoneE164(recipient);
    if (!phoneE164) return;

    const listing = await this.listingMeta(viewing.listingId);
    if (!listing) return;

    const recipientName =
      recipient?.displayName ?? recipient?.email?.split('@')[0] ?? 'User';

    let conductorName: string | undefined;
    if (kind === 'confirmed') {
      const conductor = await this.users.findById(viewing.conductorUserId);
      conductorName = conductor?.displayName ?? conductor?.email?.split('@')[0] ?? 'Host';
    }

    let otherPartyPhone: string | undefined;
    if (kind === 'reminder2h') {
      const otherId =
        userId === viewing.seekerUserId ? viewing.conductorUserId : viewing.seekerUserId;
      const other = await this.users.findById(otherId);
      otherPartyPhone = verifiedPhoneE164(other) ?? other?.phone ?? undefined;
    }

    const { whenLocal, dateLocal, timeLocal } = formatViewingWhenParts(
      viewing.startMs,
      listing.timezone,
    );
    const result = await this.whatsapp.sendTemplate({
      phoneE164,
      templateName,
      languageCode: this.config.WHATSAPP_OTP_TEMPLATE_LANG,
      bodyParams: viewingUtilityBodyParams(kind, {
        recipientName,
        conductorName,
        otherPartyPhone,
        listing,
        whenLocal,
        dateLocal,
        timeLocal,
      }),
      meta: {
        toUserId: userId,
        relatedType: 'viewing',
        relatedId: viewing.id,
        locale: this.config.WHATSAPP_OTP_TEMPLATE_LANG,
      },
    });
    if (!result.ok) {
      this.logger.warn(
        `viewing whatsapp skip kind=${kind} reason=${result.reason}${result.message ? ` ${result.message}` : ''}`,
      );
    }
  }

  private async listingMeta(listingId: string): Promise<{
    title: string;
    address: string | null;
    city: string | null;
    province: string | null;
    timezone: string;
  } | null> {
    const rows = await this.db
      .select({
        title: listings.title,
        address: listings.address,
        city: listings.city,
        province: listings.province,
        timezone: listings.timezone,
      })
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      ...r,
      timezone: r.timezone || DEFAULT_LISTING_TIMEZONE,
    };
  }

  private areaLabel(listing: { city: string | null; province: string | null }): string {
    return [listing.city, listing.province].filter(Boolean).join(', ');
  }

  private icsAttachment(
    viewing: Viewing,
    listing: { title: string; address: string | null; city: string | null; province: string | null },
    opts: { location: string; method?: 'REQUEST' | 'CANCEL' },
  ): { filename: string; content: string } {
    return {
      filename: 'viewing.ics',
      content: buildViewingIcs({
        uid: viewingIcsUid(viewing.id),
        sequence: viewing.icsSequence ?? 0,
        startMs: viewing.startMs,
        endMs: viewing.endMs,
        summary: `Visita — ${listing.title}`,
        location: opts.location,
        description: listing.title,
        method: opts.method,
      }),
    };
  }

  private async sendRequestedEmail(conductorUserId: string, viewing: Viewing): Promise<void> {
    const conductor = await this.users.findById(conductorUserId);
    if (!conductor?.email) return;
    const listing = await this.listingMeta(viewing.listingId);
    if (!listing) return;
    const seeker = await this.users.findById(viewing.seekerUserId);
    const area = this.areaLabel(listing);
    const whenLocal = formatWhenLocal(viewing.startMs, listing.timezone);
    await this.email.viewingRequested(
      conductor.email,
      {
        conductorName: conductor.displayName ?? conductor.email.split('@')[0] ?? 'Host',
        seekerName: seeker?.displayName ?? seeker?.email?.split('@')[0] ?? 'Seeker',
        listingTitle: listing.title,
        areaLabel: area,
        whenLocal,
      },
      undefined,
      this.icsAttachment(viewing, listing, { location: area }),
    );
  }

  private async sendConfirmedEmail(seekerUserId: string, viewing: Viewing): Promise<void> {
    const seeker = await this.users.findById(seekerUserId);
    if (!seeker?.email) return;
    const listing = await this.listingMeta(viewing.listingId);
    if (!listing) return;
    const address = listing.address ?? this.areaLabel(listing);
    const whenLocal = formatWhenLocal(viewing.startMs, listing.timezone);
    await this.email.viewingConfirmed(
      seeker.email,
      {
        seekerName: seeker.displayName ?? seeker.email.split('@')[0] ?? 'Seeker',
        listingTitle: listing.title,
        address,
        whenLocal,
      },
      undefined,
      this.icsAttachment(viewing, listing, { location: address }),
    );
  }

  private async sendCancelledEmail(recipientUserId: string, viewing: Viewing): Promise<void> {
    const recipient = await this.users.findById(recipientUserId);
    if (!recipient?.email) return;
    const listing = await this.listingMeta(viewing.listingId);
    if (!listing) return;
    const area = this.areaLabel(listing);
    const whenLocal = formatWhenLocal(viewing.startMs, listing.timezone);
    await this.email.viewingCancelled(
      recipient.email,
      {
        recipientName: recipient.displayName ?? recipient.email.split('@')[0] ?? 'User',
        listingTitle: listing.title,
        whenLocal,
        areaLabel: area,
      },
      undefined,
      this.icsAttachment(viewing, listing, { location: area, method: 'CANCEL' }),
    );
  }

  private async sendReminderEmail(
    seekerUserId: string,
    viewing: Viewing,
    hoursBefore: 24 | 2,
  ): Promise<void> {
    const seeker = await this.users.findById(seekerUserId);
    if (!seeker?.email) return;
    const listing = await this.listingMeta(viewing.listingId);
    if (!listing) return;
    const address = listing.address ?? this.areaLabel(listing);
    const whenLocal = formatWhenLocal(viewing.startMs, listing.timezone);
    await this.email.viewingReminder(
      seeker.email,
      {
        seekerName: seeker.displayName ?? seeker.email.split('@')[0] ?? 'Seeker',
        listingTitle: listing.title,
        address,
        whenLocal,
        hoursBefore,
      },
      undefined,
      this.icsAttachment(viewing, listing, { location: address }),
    );
  }
}

@Module({
  imports: [UsersModule, NotificationsModule],
  controllers: [ViewingsController, SellerViewingsController],
  providers: [
    ViewingsService,
    ViewingsReminderScheduler,
    ProductAnalyticsService,
    SellerOnboardingEnabledGuard,
    SellerViewingsEnabledGuard,
    { provide: AVAILABILITY_REPOSITORY, useClass: DrizzleAvailabilityRepository },
    { provide: VIEWING_REPOSITORY, useClass: DrizzleViewingRepository },
    { provide: VIEWING_LISTING_LOOKUP, useClass: DrizzleViewingListingLookup },
    { provide: VIEWING_NOTIFIER, useClass: DefaultViewingNotifier },
  ],
  exports: [ViewingsService],
})
export class ViewingsModule {}
