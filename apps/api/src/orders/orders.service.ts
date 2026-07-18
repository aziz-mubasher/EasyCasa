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

  async create(propertyId: string, req: QuoteRequest): Promise<OrderRecord> {
    const quote = this.pricing.quote(req);
    const itemCodes = this.pricing.resolveItemCodes(req);

    const order = await this.orders.create({
      propertyId,
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

    if (this.assignments) {
      try {
        const province = await this.resolveProvince(propertyId);
        await this.assignments.spawnForOrder({
          orderId: order.id,
          propertyId,
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

  private async resolveProvince(propertyId: string): Promise<string> {
    const property = await this.properties.get(propertyId);
    if (property.province) return property.province;
    if (property.listingId) {
      const rows = await this.db
        .select({ province: listings.province })
        .from(listings)
        .where(eq(listings.id, property.listingId))
        .limit(1);
      if (rows[0]?.province) return rows[0].province;
    }
    return 'MI';
  }
}
