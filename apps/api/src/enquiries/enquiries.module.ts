import { Inject, Injectable, Logger, Module } from '@nestjs/common';
import { and, desc, eq, isNotNull, lt, or } from 'drizzle-orm';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { enquiries, listings } from '../db/schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationsService } from '../notifications/notifications.service';
import { OrdersModule } from '../orders/orders.module';
import { OrdersService } from '../orders/orders.service';
import { UsersModule } from '../users/users.module';
import { Banks4AllAttestationScheduler } from './banks4all/banks4all-attestation.scheduler';
import { Banks4AllAttestationSweep } from './banks4all/banks4all-attestation.sweep';
import { BANKS4ALL_PORT } from './banks4all/banks4all.port';
import { HttpBanks4AllAdapter } from './banks4all/http-banks4all.adapter';
import {
  ENQUIRY_NOTIFIER,
  ENQUIRY_REPOSITORY,
  LISTING_LOOKUP,
  ORDER_CREATION,
  type Banks4AllAttestationFields,
  type EnquiryNotifier,
  type EnquiryRepository,
  type ListingLookupPort,
} from './domain/ports';
import type { Enquiry, EnquiryIntent, ListingParties } from './domain/types';
import { EnquiriesController } from './enquiries.controller';
import { EnquiriesService } from './enquiries.service';
import {
  LISTING_ORDER_CONTEXT,
  ORDERS_SERVICE,
  OrdersBridge,
} from './order-bridge/orders.bridge';
import {
  DrizzleListingOrderContext,
  PHASE10_ORDERS_SERVICE,
  Phase10OrdersAdapter,
} from './order-bridge/phase10-orders.adapter';

type Row = typeof enquiries.$inferSelect;

function toDomain(r: Row): Enquiry {
  return {
    id: r.id,
    listingId: r.listingId,
    seekerUserId: r.seekerUserId,
    ownerUserId: r.ownerUserId,
    mediatorUserId: r.mediatorUserId,
    intent: r.intent as EnquiryIntent,
    status: r.status as Enquiry['status'],
    message: r.message,
    contactEmail: r.contactEmail,
    contactPhone: r.contactPhone,
    contactWhatsappAvailable: r.contactWhatsappAvailable,
    orderId: r.orderId,
    b4aToken: r.b4aToken ?? null,
    b4aBandMaxCents: r.b4aBandMaxCents ?? null,
    b4aExpiresAt: r.b4aExpiresAt ?? null,
    b4aCheckedAt: r.b4aCheckedAt ? r.b4aCheckedAt.toISOString() : null,
  };
}

@Injectable()
export class DrizzleEnquiryRepository implements EnquiryRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async create(input: {
    listingId: string;
    seekerUserId: string;
    ownerUserId: string;
    mediatorUserId: string | null;
    intent: EnquiryIntent;
    message: string;
    contactEmail: string | null;
    contactPhone: string | null;
    contactWhatsappAvailable: boolean;
    b4aToken?: string | null;
    b4aBandMaxCents?: number | null;
    b4aExpiresAt?: string | null;
    b4aCheckedAt?: Date | null;
  }): Promise<Enquiry> {
    const [r] = await this.db
      .insert(enquiries)
      .values({
        listingId: input.listingId,
        seekerUserId: input.seekerUserId,
        ownerUserId: input.ownerUserId,
        mediatorUserId: input.mediatorUserId,
        intent: input.intent,
        status: 'NEW',
        message: input.message,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        contactWhatsappAvailable: input.contactWhatsappAvailable,
        b4aToken: input.b4aToken ?? null,
        b4aBandMaxCents: input.b4aBandMaxCents ?? null,
        b4aExpiresAt: input.b4aExpiresAt ?? null,
        b4aCheckedAt: input.b4aCheckedAt ?? null,
      })
      .returning();
    return toDomain(r);
  }

  async get(id: string): Promise<Enquiry | null> {
    const rows = await this.db.select().from(enquiries).where(eq(enquiries.id, id)).limit(1);
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async listForSeeker(seekerUserId: string): Promise<Enquiry[]> {
    const rows = await this.db
      .select()
      .from(enquiries)
      .where(eq(enquiries.seekerUserId, seekerUserId))
      .orderBy(desc(enquiries.createdAt));
    return rows.map(toDomain);
  }

  async listForOwner(userId: string): Promise<Enquiry[]> {
    const rows = await this.db
      .select()
      .from(enquiries)
      .where(or(eq(enquiries.ownerUserId, userId), eq(enquiries.mediatorUserId, userId)))
      .orderBy(desc(enquiries.createdAt));
    return rows.map(toDomain);
  }

  async setStatus(id: string, status: Enquiry['status']): Promise<void> {
    await this.db
      .update(enquiries)
      .set({ status, updatedAt: new Date() })
      .where(eq(enquiries.id, id));
  }

  async setOrder(id: string, orderId: string, status: Enquiry['status']): Promise<void> {
    await this.db
      .update(enquiries)
      .set({ orderId, status, updatedAt: new Date() })
      .where(eq(enquiries.id, id));
  }

  async setBanks4All(id: string, fields: Banks4AllAttestationFields): Promise<void> {
    await this.db
      .update(enquiries)
      .set({
        b4aToken: fields.b4aToken,
        b4aBandMaxCents: fields.b4aBandMaxCents,
        b4aExpiresAt: fields.b4aExpiresAt,
        b4aCheckedAt: fields.b4aCheckedAt,
        updatedAt: new Date(),
      })
      .where(eq(enquiries.id, id));
  }

  async clearBanks4All(id: string): Promise<void> {
    await this.setBanks4All(id, {
      b4aToken: null,
      b4aBandMaxCents: null,
      b4aExpiresAt: null,
      b4aCheckedAt: null,
    });
  }

  async clearBanks4AllForSeeker(seekerUserId: string): Promise<number> {
    const updated = await this.db
      .update(enquiries)
      .set({
        b4aToken: null,
        b4aBandMaxCents: null,
        b4aExpiresAt: null,
        b4aCheckedAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(enquiries.seekerUserId, seekerUserId), isNotNull(enquiries.b4aToken)))
      .returning({ id: enquiries.id });
    return updated.length;
  }

  async listBanks4AllDueForSweep(): Promise<Enquiry[]> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rows = await this.db
      .select()
      .from(enquiries)
      .where(and(isNotNull(enquiries.b4aToken), lt(enquiries.b4aCheckedAt, cutoff)));
    return rows.map(toDomain);
  }
}

@Injectable()
export class DrizzleListingLookup implements ListingLookupPort {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async getParties(listingIdOrSlug: string): Promise<ListingParties | null> {
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
        slug: listings.slug,
        address: listings.address,
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
      ownerUserId,
      mediatorUserId: r.mediatorUserId,
      title: r.title,
      slug: r.slug ?? r.id,
      address: r.address,
    };
  }
}

@Injectable()
export class DefaultEnquiryNotifier implements EnquiryNotifier {
  private readonly logger = new Logger(DefaultEnquiryNotifier.name);

  constructor(private readonly notifications: NotificationsService) {}

  async notifyNewEnquiry(userId: string, enquiry: Enquiry): Promise<void> {
    try {
      await this.notifications.notify(
        userId,
        'enquiry.new',
        {
          enquiryId: enquiry.id,
          listingId: enquiry.listingId,
          intent: enquiry.intent,
          message: enquiry.message.slice(0, 200),
        },
        ['in_app', 'push'],
      );
    } catch (err) {
      this.logger.warn(
        `enquiry notify failed user=${userId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

@Module({
  imports: [UsersModule, OrdersModule, NotificationsModule],
  controllers: [EnquiriesController],
  providers: [
    EnquiriesService,
    { provide: ENQUIRY_REPOSITORY, useClass: DrizzleEnquiryRepository },
    { provide: LISTING_LOOKUP, useClass: DrizzleListingLookup },
    { provide: ENQUIRY_NOTIFIER, useClass: DefaultEnquiryNotifier },
    { provide: BANKS4ALL_PORT, useClass: HttpBanks4AllAdapter },
    Banks4AllAttestationSweep,
    Banks4AllAttestationScheduler,

    // Phase 26: bridge → mapping → Phase 10 adapter (OrdersModule exports OrdersService).
    { provide: ORDER_CREATION, useClass: OrdersBridge },
    { provide: LISTING_ORDER_CONTEXT, useClass: DrizzleListingOrderContext },
    { provide: ORDERS_SERVICE, useClass: Phase10OrdersAdapter },
    { provide: PHASE10_ORDERS_SERVICE, useExisting: OrdersService },
  ],
  exports: [EnquiriesService, ENQUIRY_REPOSITORY],
})
export class EnquiriesModule {}
