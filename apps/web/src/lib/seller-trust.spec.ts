import { describe, expect, it } from 'vitest';

import {
  listingShowsVerifiedBadge,
  parseIntestatariInput,
  parseSellerListingsWithTrust,
  parseVoCase,
  resolveVoRejectionTemplateKey,
  shouldShowChecklistSurface,
  shouldShowTrustNav,
  shouldShowVoSurface,
  voCanSubmit,
  voStateToUiPhase,
} from './seller-trust';

describe('seller-trust (PP-6)', () => {
  it('parseSellerListingsWithTrust includes trust flags defaulting false', () => {
    const parsed = parseSellerListingsWithTrust({
      flags: { listingBoostEnabled: false, sellerPremiumEnabled: false },
      items: [],
    });
    expect(parsed?.flags.verifiedOwnerEnabled).toBe(false);
    expect(parsed?.flags.sellerChecklistEnabled).toBe(false);
  });

  it('flag-off invisibility — trust surfaces hidden when flags false', () => {
    expect(shouldShowVoSurface({ verifiedOwnerEnabled: false, sellerChecklistEnabled: false })).toBe(
      false,
    );
    expect(
      shouldShowChecklistSurface({ verifiedOwnerEnabled: false, sellerChecklistEnabled: false }),
    ).toBe(false);
    expect(shouldShowTrustNav({ verifiedOwnerEnabled: false, sellerChecklistEnabled: false })).toBe(
      false,
    );
  });

  it('flag-on — at least one trust surface visible', () => {
    expect(shouldShowTrustNav({ verifiedOwnerEnabled: true, sellerChecklistEnabled: false })).toBe(
      true,
    );
  });

  it('maps VO API state submitted to documents_submitted UI phase', () => {
    expect(voStateToUiPhase('submitted')).toBe('documents_submitted');
    expect(voStateToUiPhase('none')).toBe('unverified');
    expect(voStateToUiPhase('verified')).toBe('verified');
  });

  it('voCanSubmit follows uploadOpen states', () => {
    expect(voCanSubmit('none')).toBe(true);
    expect(voCanSubmit('rejected')).toBe(true);
    expect(voCanSubmit('expired')).toBe(true);
    expect(voCanSubmit('submitted')).toBe(false);
    expect(voCanSubmit('verified')).toBe(false);
  });

  it('parseVoCase preserves rejection reason for resubmit path', () => {
    const parsed = parseVoCase({
      id: 'c1',
      listingId: 'l1',
      state: 'rejected',
      docKeys: [],
      decisionReason: 'visura illeggibile',
      updatedAt: '2026-08-14T00:00:00.000Z',
    });
    expect(parsed?.state).toBe('rejected');
    expect(parsed?.decisionReason).toBe('visura illeggibile');
    expect(voCanSubmit(parsed!.state)).toBe(true);
  });

  it('resolveVoRejectionTemplateKey maps known moderator phrases', () => {
    expect(resolveVoRejectionTemplateKey('visura illeggibile')).toBe('illegible_document');
    expect(resolveVoRejectionTemplateKey('custom note')).toBeNull();
  });

  it('parseIntestatariInput accepts newline and JSON array', () => {
    expect(parseIntestatariInput('Mario Rossi\nLuigi Verdi')).toEqual(['Mario Rossi', 'Luigi Verdi']);
    expect(parseIntestatariInput('["Mario Rossi"]')).toEqual(['Mario Rossi']);
  });

  it('listingShowsVerifiedBadge only when verified state', () => {
    expect(listingShowsVerifiedBadge({ verifiedOwner: true, voState: 'verified', docScore: null })).toBe(
      true,
    );
    expect(
      listingShowsVerifiedBadge({ verifiedOwner: false, voState: 'submitted', docScore: null }),
    ).toBe(false);
  });
});
