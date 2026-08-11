import { describe, expect, it } from 'vitest';
import { NotFoundException } from '@nestjs/common';

import {
  buildSellerListingAnalytics,
  enquiryRate,
  parseAnalyticsWindow,
  windowDayCount,
} from '@easycasa/shared';

import { SellerAnalyticsEnabledGuard } from './seller-analytics.guard';
import type { ApiConfig } from '../config';

describe('seller analytics aggregation (EC-S-T23)', () => {
  it('computes enquiryRate = enquiries/views; 0 when views=0', () => {
    expect(enquiryRate(3, 100)).toBe(0.03);
    expect(enquiryRate(0, 50)).toBe(0);
    expect(enquiryRate(5, 0)).toBe(0);
  });

  it('fixture counts reconcile into DTO', () => {
    // Seeded: 120 views, 8 saves, 6 enquiries over 30d; published 14 days ago.
    const dto = buildSellerListingAnalytics({
      views: 120,
      saves: 8,
      enquiries: 6,
      daysOnMarket: 14,
      priceVsOmiBandPct: 12.5,
      zoneMedianDaysOnMarket: null,
      series: [
        { day: '2026-08-01', views: 40 },
        { day: '2026-08-02', views: 80 },
      ],
    });
    expect(dto).toEqual({
      views: 120,
      saves: 8,
      enquiries: 6,
      enquiryRate: 0.05,
      daysOnMarket: 14,
      priceVsOmiBandPct: 12.5,
      series: [
        { day: '2026-08-01', views: 40 },
        { day: '2026-08-02', views: 80 },
      ],
    });
    expect('zoneMedianDaysOnMarket' in dto).toBe(false);
  });

  it('omits priceVsOmiBandPct and zoneMedian when absent', () => {
    const dto = buildSellerListingAnalytics({
      views: 10,
      saves: 1,
      enquiries: 0,
      daysOnMarket: 3,
      priceVsOmiBandPct: null,
      zoneMedianDaysOnMarket: null,
    });
    expect(dto.views).toBe(10);
    expect(dto.enquiryRate).toBe(0);
    expect(dto).not.toHaveProperty('priceVsOmiBandPct');
    expect(dto).not.toHaveProperty('zoneMedianDaysOnMarket');
    expect(dto).not.toHaveProperty('series');
  });

  it('parses window query (default 30d)', () => {
    expect(parseAnalyticsWindow(undefined)).toBe('30d');
    expect(parseAnalyticsWindow('7d')).toBe('7d');
    expect(parseAnalyticsWindow('90d')).toBe('90d');
    expect(parseAnalyticsWindow('bogus')).toBe('30d');
    expect(windowDayCount('7d')).toBe(7);
    expect(windowDayCount('30d')).toBe(30);
    expect(windowDayCount('90d')).toBe(90);
  });
});

describe('SellerAnalyticsEnabledGuard', () => {
  it('404 when SELLER_ANALYTICS_ENABLED is false', () => {
    const guard = new SellerAnalyticsEnabledGuard({
      SELLER_ANALYTICS_ENABLED: false,
    } as ApiConfig);
    expect(() => guard.canActivate()).toThrow(NotFoundException);
  });

  it('allows when SELLER_ANALYTICS_ENABLED is true', () => {
    const guard = new SellerAnalyticsEnabledGuard({
      SELLER_ANALYTICS_ENABLED: true,
    } as ApiConfig);
    expect(guard.canActivate()).toBe(true);
  });
});
