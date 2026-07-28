import { describe, expect, it, beforeEach } from 'vitest';
import {
  PRODUCT_EVENTS,
  ProductAnalyticsSink,
  productAnalytics,
  weeklyHours,
  defaultAvailabilityWindows,
} from '@easycasa/shared';

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
