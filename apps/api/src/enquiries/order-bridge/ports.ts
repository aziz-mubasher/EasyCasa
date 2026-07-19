import type { CreateOrderInput, ListingOrderContext } from './types';

/** Seam onto the Phase 10 order pipeline. */
export interface OrdersServicePort {
  createOrder(input: CreateOrderInput): Promise<{ id: string }>;
}

/** Resolves the listing price used as the provvigione reference value. */
export interface ListingOrderContextPort {
  get(listingId: string): Promise<ListingOrderContext | null>;
}
