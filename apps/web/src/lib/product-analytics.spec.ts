import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PRODUCT_EVENTS,
  ProductAnalyticsSink,
  productAnalytics,
  weeklyHours,
  defaultAvailabilityWindows,
} from '@easycasa/shared';

const sendEvent = vi.fn();

vi.mock('./analytics/beacon', () => ({
  sendEvent: (...args: unknown[]) => sendEvent(...args),
}));

import { trackProduct } from './product-analytics';

describe('EC-5 product analytics events', () => {
  beforeEach(() => {
    productAnalytics.clear();
  });

  it('records the six funnel events with expected props', () => {
    const sink = productAnalytics;
    const windows = defaultAvailabilityWindows();
    sink.track(PRODUCT_EVENTS.LISTING_AVAILABILITY_SET, {
      windowCount: windows.length,
      weeklyHours: weeklyHours(windows),
    });
    sink.track(PRODUCT_EVENTS.LISTING_AVAILABILITY_SKIPPED, { listingId: 'L1' });
    sink.track(PRODUCT_EVENTS.LISTING_AVAILABILITY_EDITED, {
      windowCount: 1,
      weeklyHours: 2,
    });
    sink.track(PRODUCT_EVENTS.VIEWING_PICKER_VIEWED, { slots_available: 4 });
    sink.track(PRODUCT_EVENTS.VIEWING_PICKER_EMPTY, { slots_available: 0 });
    sink.track(PRODUCT_EVENTS.VIEWING_REQUESTED, { weeklyHours: 13 });

    expect(sink.of(PRODUCT_EVENTS.LISTING_AVAILABILITY_SET)).toHaveLength(1);
    expect(sink.of(PRODUCT_EVENTS.LISTING_AVAILABILITY_SKIPPED)).toHaveLength(1);
    expect(sink.of(PRODUCT_EVENTS.LISTING_AVAILABILITY_EDITED)).toHaveLength(1);
    expect(sink.of(PRODUCT_EVENTS.VIEWING_PICKER_VIEWED)[0]?.props.slots_available).toBe(4);
    expect(sink.of(PRODUCT_EVENTS.VIEWING_PICKER_EMPTY)).toHaveLength(1);
    expect(sink.of(PRODUCT_EVENTS.VIEWING_REQUESTED)[0]?.props.weeklyHours).toBe(13);
  });

  it('isolates sinks', () => {
    const a = new ProductAnalyticsSink();
    a.track(PRODUCT_EVENTS.VIEWING_PICKER_EMPTY, {});
    expect(productAnalytics.events).toHaveLength(0);
    expect(a.events).toHaveLength(1);
  });
});

describe('trackProduct collector forward', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {});
    sendEvent.mockClear();
    productAnalytics.clear();
  });

  it('keeps the in-memory sink and forwards only the allow-list', () => {
    trackProduct(PRODUCT_EVENTS.LISTING_VIEW, { locale: 'it', email: 'a@b.c' });
    trackProduct(PRODUCT_EVENTS.ASTE_PAGE_VIEW, { locale: 'it' });
    expect(productAnalytics.of(PRODUCT_EVENTS.LISTING_VIEW)).toHaveLength(1);
    expect(productAnalytics.of(PRODUCT_EVENTS.ASTE_PAGE_VIEW)).toHaveLength(1);
    expect(sendEvent).toHaveBeenCalledTimes(1);
    expect(sendEvent).toHaveBeenCalledWith('listing.view', { locale: 'it' });
  });
});
