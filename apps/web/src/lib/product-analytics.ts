import {
  productAnalytics,
  type ProductEventName,
  type ProductEventProps,
} from '@easycasa/shared';

/** Client-side product analytics — shared sink + console for pilot. */
export function trackProduct(
  name: ProductEventName,
  props: ProductEventProps = {},
): void {
  productAnalytics.track(name, props);
  if (typeof console !== 'undefined' && typeof console.info === 'function') {
    console.info('[analytics]', name, props);
  }
}

export { productAnalytics, PRODUCT_EVENTS } from '@easycasa/shared';
