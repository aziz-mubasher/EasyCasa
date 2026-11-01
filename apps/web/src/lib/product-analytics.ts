import { isWebConversion, productAnalytics, sanitizeEventProps, type ProductEventName, type ProductEventProps } from '@easycasa/shared';

import { sendEvent } from './analytics/beacon';

/** Client product events. The in-memory sink stays for tests. Allow-listed names also go to the collector. */
export function trackProduct(name: ProductEventName, props: ProductEventProps = {}): void {
  productAnalytics.track(name, props);
  if (typeof window === 'undefined' || !isWebConversion(name)) return;
  const clean = sanitizeEventProps(props);
  sendEvent(name, clean ?? undefined);
}

export { productAnalytics, PRODUCT_EVENTS } from '@easycasa/shared';
