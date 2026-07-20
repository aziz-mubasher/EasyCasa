import { Inject, Injectable, Logger, NotFoundException, Optional, forwardRef } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { AssignmentsService } from '../assignments/assignments.service';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { listings } from '../db/schema';
import { PropertiesService } from '../properties/properties.service';
import { nextOrderStatus } from '../transactions/domain/state';
import type {
  OrderRecord,
  OrderRepository,
  PricingPort,
} from '../transactions/domain/ports';
import type { OrderEvent, QuoteRequest } from '../transactions/domain/types';
import { assertOrderSubject, buyerSubject, ownerSubject, type OrderSubject } from './domain/order-subject';

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');
export const PRICING_PORT = Symbol('PRICING_PORT');

@Injectable()
export class OrdersService {
  private readonly log = new Logger(OrdersService.name);

  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(PRICING_PORT) private readonly pricing: PricingPort,
    private readonly properties: PropertiesService,
    @Inject(DRIZZLE) private readonly db: Db,
    @Optional()
    @Inject(forwardRef(() => AssignmentsService))
    private readonly assignments?: AssignmentsService,
  ) {}

  /** Owner / fascicolo checkout — property-rooted. */
  async create(propertyId: string, req: QuoteRequest): Promise<OrderRecord> {
    const property = await this.properties.get(propertyId);
    return this.createWithSubject(ownerSubject(propertyId, property.listingId ?? null), req);
  }

  /** Buyer / enquiry conversion — listing-rooted (no invented Property). */
  async createForListing(listingId: string, req: QuoteRequest): Promise<OrderRecord> {
    const rows = await this.db
      .select({ id: listings.id })
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);
    if (!rows[0]) throw new NotFoundException(`Listing ${listingId} not found`);
    return this.createWithSubject(buyerSubject(listingId), req);
  }

  private async createWithSubject(subject: OrderSubject, req: QuoteRequest): Promise<OrderRecord> {
    assertOrderSubject(subject);
    const quote = this.pricing.quote(req);
    const itemCodes = this.pricing.resolveItemCodes(req);

    const order = await this.orders.create({
      propertyId: subject.propertyId,
      listingId: subject.listingId,
      packageCode: req.packageCode ?? null,
      status: 'CONFIRMED',
      itemCodes,
      lines: quote.lines.map((l) => ({
        itemCode: l.code,
        kind: l.kind,
        netCents: l.netCents,
        ivaCents: l.ivaCents,
        grossCents: l.grossCents,
        estimated: l.estimated,
      })),
      dueNowGrossCents: quote.dueNowGrossCents,
      estimatedTotalGrossCents: quote.estimatedTotalGrossCents,
      dueNowNetCents: quote.lines
        .filter((l) => l.kind !== 'provvigione')
        .reduce((s, l) => s + l.netCents, 0),
      clientFiscalCode: null,
    });

    if (this.assignments && subject.propertyId) {
      try {
        const province = await this.resolveProvince(subject);
        await this.assignments.spawnForOrder({
          orderId: order.id,
          propertyId: subject.propertyId,
          itemCodes: order.itemCodes,
          province,
        });
      } catch (err) {
        this.log.warn(
          `Failed to spawn professional tasks for order ${order.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    return order;
  }

  async get(id: string): Promise<OrderRecord> {
    const order = await this.orders.get(id);
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  async advance(id: string, event: OrderEvent): Promise<OrderRecord> {
    const order = await this.get(id);
    const status = nextOrderStatus(order.status, event);
    await this.orders.setStatus(id, status);
    return { ...order, status };
  }

  private async resolveProvince(subject: OrderSubject): Promise<string> {
    if (subject.propertyId) {
      const property = await this.properties.get(subject.propertyId);
      if (property.province) return property.province;
      if (property.listingId) {
        const rows = await this.db
          .select({ province: listings.province })
          .from(listings)
          .where(eq(listings.id, property.listingId))
          .limit(1);
        if (rows[0]?.province) return rows[0].province;
      }
    }
    if (subject.listingId) {
      const rows = await this.db
        .select({ province: listings.province })
        .from(listings)
        .where(eq(listings.id, subject.listingId))
        .limit(1);
      if (rows[0]?.province) return rows[0].province;
    }
    return 'MI';
  }
}
