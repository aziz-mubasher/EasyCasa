import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DRIZZLE } from '../../db/db.module';
import type { Db } from '../../db/drizzle';
import { listings, properties } from '../../db/schema';
import type { OrdersService } from '../../orders/orders.service';
import type { ListingOrderContextPort, OrdersServicePort } from './ports';
import type { CreateOrderInput, ListingOrderContext } from './types';

/**
 * The Phase 10 surface this adapter needs. Bound to the real `OrdersService`
 * via `useExisting`. If the method name/shape changes, adapt only here.
 */
export interface Phase10OrdersService {
  create(
    propertyId: string,
    req: { items?: string[]; referenceValueCents?: number },
  ): Promise<{ id: string }>;
  createForListing(
    listingId: string,
    req: { items?: string[]; referenceValueCents?: number },
  ): Promise<{ id: string }>;
}

export const PHASE10_ORDERS_SERVICE = Symbol('PHASE10_ORDERS_SERVICE');

/**
 * Reconciles the enquiry bridge's `CreateOrderInput` onto Phase 10 orders.
 *
 * - BUYER → `createForListing` (listing-rooted; Phase 31 — no invented Property)
 * - OWNER → resolve/create fascicolo then `create(propertyId)`
 *
 * `partyUserId` / `source` are accepted for the bridge contract but not yet
 * persisted on `service_orders`.
 */
@Injectable()
export class Phase10OrdersAdapter implements OrdersServicePort {
  private readonly logger = new Logger(Phase10OrdersAdapter.name);

  constructor(
    @Inject(PHASE10_ORDERS_SERVICE) private readonly orders: Phase10OrdersService,
    @Inject(DRIZZLE) private readonly db: Db,
  ) {}

  async createOrder(input: CreateOrderInput): Promise<{ id: string }> {
    const req = {
      items: input.itemCodes,
      referenceValueCents: input.referenceValueCents ?? undefined,
    };

    if (input.partyRole === 'BUYER') {
      const order = await this.orders.createForListing(input.listingId, req);
      this.logger.log(
        `enquiry → buyer order ${order.id} (listing=${input.listingId}, party=${input.partyUserId}, items=${input.itemCodes.join(',')})`,
      );
      return { id: order.id };
    }

    const propertyId = await this.findOrCreateProperty(input.listingId);
    const order = await this.orders.create(propertyId, req);
    this.logger.log(
      `enquiry → owner order ${order.id} (property=${propertyId}, listing=${input.listingId}, party=${input.partyUserId}, items=${input.itemCodes.join(',')})`,
    );
    return { id: order.id };
  }

  private async findOrCreateProperty(listingId: string): Promise<string> {
    const listingRows = await this.db
      .select({
        id: listings.id,
        title: listings.title,
        transactionType: listings.transactionType,
        province: listings.province,
        ownerUserId: listings.ownerUserId,
        agentId: listings.agentId,
      })
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);
    const listing = listingRows[0];
    if (!listing) throw new NotFoundException(`Listing ${listingId} not found for order draft`);

    const ownerId = listing.ownerUserId ?? listing.agentId;
    if (!ownerId) {
      throw new NotFoundException(`Listing ${listing.id} has no owner for property link`);
    }

    const existing = await this.db
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.listingId, listingId))
      .limit(1);
    if (existing[0]) return existing[0].id;

    const [created] = await this.db
      .insert(properties)
      .values({
        ownerId,
        listingId: listing.id,
        dealType: listing.transactionType === 'rent' ? 'rent' : 'sale',
        title: listing.title,
        province: listing.province,
        status: 'published',
      })
      .returning({ id: properties.id });
    return created.id;
  }
}

@Injectable()
export class DrizzleListingOrderContext implements ListingOrderContextPort {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async get(listingId: string): Promise<ListingOrderContext | null> {
    const rows = await this.db
      .select({ price: listings.price })
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const priceCents =
      row.price != null && Number.isFinite(Number(row.price))
        ? Math.round(Number(row.price) * 100)
        : null;
    return { priceCents };
  }
}

/** Type-check that `OrdersService` satisfies the adapter's expected surface. */
export type _AssertOrdersServiceCompatible = OrdersService extends Phase10OrdersService
  ? true
  : never;
