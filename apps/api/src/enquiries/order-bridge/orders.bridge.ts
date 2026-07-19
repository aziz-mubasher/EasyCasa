import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type { OrderCreationPort } from '../domain/ports';
import type { OrderDraft } from '../domain/types';
import { buildCreateOrderInput } from './order-mapping';
import type { ListingOrderContextPort, OrdersServicePort } from './ports';

export const ORDERS_SERVICE = Symbol('ORDERS_SERVICE');
export const LISTING_ORDER_CONTEXT = Symbol('LISTING_ORDER_CONTEXT');

/**
 * Real implementation of the Phase 24 `OrderCreationPort`. Resolves the
 * listing's price, maps the enquiry draft to a Phase 10 create-order input, and
 * creates the order so `convert` produces a real order end-to-end.
 */
@Injectable()
export class OrdersBridge implements OrderCreationPort {
  constructor(
    @Inject(ORDERS_SERVICE) private readonly orders: OrdersServicePort,
    @Inject(LISTING_ORDER_CONTEXT) private readonly listings: ListingOrderContextPort,
  ) {}

  async createFromDraft(draft: OrderDraft): Promise<{ orderId: string }> {
    const ctx = await this.listings.get(draft.subjectListingId);
    if (!ctx) throw new NotFoundException(`Listing ${draft.subjectListingId} not found`);
    const input = buildCreateOrderInput(draft, ctx);
    const { id } = await this.orders.createOrder(input);
    return { orderId: id };
  }
}
