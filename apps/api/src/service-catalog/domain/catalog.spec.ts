import { describe, expect, it } from 'vitest';
import { isPonte } from '@easycasa/shared';

import { CATALOG, listPublicCatalogItems, listPublicPackages } from './catalog';

describe('public service catalog (PONTE)', () => {
  it('exposes no provvigione SKU on the public list', () => {
    expect(isPonte()).toBe(true);
    const publicItems = listPublicCatalogItems();
    expect(publicItems.every((i) => i.active)).toBe(true);
    expect(publicItems.some((i) => i.priceModel === 'provvigione')).toBe(false);
    expect(publicItems.map((i) => i.code)).not.toContain('FULL_MEDIATION');
    expect(publicItems.map((i) => i.code)).not.toContain('BUYER_MEDIATION');
    expect(publicItems.map((i) => i.code)).toContain('LISTING_PUBLICATION');
    expect(publicItems.map((i) => i.code)).toContain('VIEWING_KIT');
    expect(publicItems.map((i) => i.code)).toContain('PROPOSAL_NOTE');
  });

  it('keeps deactivated rows in the seed (they return at month 12)', () => {
    const codes = CATALOG.map((i) => i.code);
    expect(codes).toContain('FULL_MEDIATION');
    expect(codes).toContain('OFFER_DRAFTING');
    expect(codes).toContain('APE_ISSUANCE');
    expect(codes).toContain('TENANT_SCREENING');
    expect(codes).toContain('ROGITO_COORDINATION');
    expect(CATALOG.find((i) => i.code === 'FULL_MEDIATION')?.active).toBe(false);
  });

  it('lists only the three PONTE bundles', () => {
    const pkgs = listPublicPackages();
    expect(pkgs.map((p) => p.code)).toEqual([
      'READY_TO_LIST',
      'READY_TO_SELL',
      'RENTING_MADE_SIMPLE',
    ]);
    expect(pkgs.some((p) => p.includes.includes('FULL_MEDIATION'))).toBe(false);
  });
});
