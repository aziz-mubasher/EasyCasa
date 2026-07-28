import { Injectable, Logger } from '@nestjs/common';
import {
  productAnalytics,
  type ProductEventName,
  type ProductEventProps,
} from '@easycasa/shared';

/**
 * Nest wrapper around the shared in-memory product analytics sink.
 * Events are also logged as structured JSON for VPS log shipping.
 */
@Injectable()
export class ProductAnalyticsService {
  private readonly log = new Logger('ProductAnalytics');

  track(name: ProductEventName, props: ProductEventProps = {}): void {
    productAnalytics.track(name, props);
    this.log.log(JSON.stringify({ event: name, ...props }));
  }
}
