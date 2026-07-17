import { Inject, Injectable, NotFoundException } from '@nestjs/common';

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
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(PRICING_PORT) private readonly pricing: PricingPort,
  ) {}

  /**
   * Create an order from a selection. Pricing is recomputed authoritatively on
   * the server — the client's numbers are never trusted — and the persisted
   * lines are exactly what the pricing engine returns.
   */
  async create(propertyId: string, req: QuoteRequest): Promise<OrderRecord> {
    const quote = this.pricing.quote(req);
    const itemCodes = this.pricing.resolveItemCodes(req);

    return this.orders.create({
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
    });
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
}
