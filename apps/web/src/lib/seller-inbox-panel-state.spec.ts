import { describe, expect, it } from 'vitest';

import {
  buildEnquiriesQuery,
  formatBandAmount,
  formatReceivedAt,
  resolveInboxPanelState,
} from './seller-inbox-panel-state';

describe('resolveInboxPanelState (EC-S-T20 inbox UI states)', () => {
  const base = {
    ready: true,
    isAuthenticated: true,
    loading: false,
    error: null as string | null,
    itemCount: 0,
  };

  it('signIn when authenticated session is missing', () => {
    expect(
      resolveInboxPanelState({ ...base, isAuthenticated: false }),
    ).toBe('signIn');
  });

  it('loading while fetch is in flight', () => {
    expect(resolveInboxPanelState({ ...base, loading: true })).toBe('loading');
  });

  it('unavailable when API returns 404 (flag off server-side)', () => {
    expect(resolveInboxPanelState({ ...base, error: 'unavailable' })).toBe('unavailable');
  });

  it('error on generic load failure', () => {
    expect(resolveInboxPanelState({ ...base, error: 'load' })).toBe('error');
  });

  it('empty when API returns zero items', () => {
    expect(resolveInboxPanelState({ ...base, itemCount: 0 })).toBe('empty');
  });

  it('ready when items are present', () => {
    expect(resolveInboxPanelState({ ...base, itemCount: 3 })).toBe('ready');
  });
});

describe('buildEnquiriesQuery', () => {
  it('includes sort and optional filters', () => {
    expect(
      buildEnquiriesQuery({ sort: 'badge_first', badgedOnly: true, unreadOnly: false }),
    ).toBe('sort=badge_first&badgedOnly=true');
  });
});

describe('formatBandAmount', () => {
  it('formats EUR band from cents', () => {
    const out = formatBandAmount(25000000, 'it-IT');
    expect(out).toMatch(/250/);
  });
});

describe('formatReceivedAt', () => {
  it('returns a non-empty localized string', () => {
    const out = formatReceivedAt('2026-08-12T10:30:00.000Z', 'en-GB');
    expect(out.length).toBeGreaterThan(5);
  });
});
