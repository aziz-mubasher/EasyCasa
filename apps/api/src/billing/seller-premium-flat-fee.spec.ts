/**
 * EC-S-T27 — flat-fee assertion for seller_premium plan definition.
 * T04 matrix row 8 / rule 4: prices must be fixed EUR amounts, never
 * derived from listing price or sale outcome.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('seller_premium plan flat-fee (T04 row 8)', () => {
  it('migration seeds a fixed positive price_cents (not listing-contingent)', () => {
    const sqlPath = join(
      __dirname,
      '../../../../migration/sql/0061_ecs_t27_seller_subscription.sql',
    );
    const sql = readFileSync(sqlPath, 'utf8');
    expect(sql).toMatch(/seller_premium/);
    expect(sql).toMatch(/price_cents[\s\S]*1900/);
    // Guardrails: no references to listing price / commission / percent-of-sale.
    expect(sql).not.toMatch(/listing_price|sale_price|commission|percent|%\s*of/i);
  });

  it('DEFAULT_ENTITLEMENTS premium limits are explicit constants (not price-derived)', async () => {
    const { DEFAULT_ENTITLEMENTS } = await import('@easycasa/shared');
    expect(DEFAULT_ENTITLEMENTS.premium.maxActiveListings).toBe(20);
    expect(DEFAULT_ENTITLEMENTS.premium.maxUploadsPerDay).toBe(100);
    expect(DEFAULT_ENTITLEMENTS.pastDueGraceDays).toBe(7);
  });
});
