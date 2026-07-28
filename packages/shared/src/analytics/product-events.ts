/** Product analytics event names for EC-5 viewing funnel instrumentation. */
export const PRODUCT_EVENTS = {
  LISTING_AVAILABILITY_SET: 'listing.availability_set',
  LISTING_AVAILABILITY_SKIPPED: 'listing.availability_skipped',
  LISTING_AVAILABILITY_EDITED: 'listing.availability_edited',
  VIEWING_PICKER_VIEWED: 'viewing.picker_viewed',
  VIEWING_PICKER_EMPTY: 'viewing.picker_empty',
  VIEWING_REQUESTED: 'viewing.requested',
} as const;

export type ProductEventName = (typeof PRODUCT_EVENTS)[keyof typeof PRODUCT_EVENTS];

export type ProductEventProps = Record<string, string | number | boolean | null | undefined>;

export interface ProductEvent {
  name: ProductEventName;
  props: ProductEventProps;
  atMs: number;
}

/** In-memory sink — tests assert against it; production logs structured JSON. */
export class ProductAnalyticsSink {
  readonly events: ProductEvent[] = [];
  private readonly max: number;

  constructor(max = 500) {
    this.max = max;
  }

  track(name: ProductEventName, props: ProductEventProps = {}, atMs = Date.now()): void {
    this.events.push({ name, props, atMs });
    if (this.events.length > this.max) this.events.shift();
  }

  clear(): void {
    this.events.length = 0;
  }

  of(name: ProductEventName): ProductEvent[] {
    return this.events.filter((e) => e.name === name);
  }
}

export const productAnalytics = new ProductAnalyticsSink();
