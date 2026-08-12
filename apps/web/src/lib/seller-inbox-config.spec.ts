import { afterEach, describe, expect, it } from 'vitest';

import {
  sellerInboxEnabled,
  sellerInboxRouteAllowed,
} from './seller-inbox-config';

describe('sellerInboxEnabled (EC-S-T20 route flag)', () => {
  const prev = process.env.NEXT_PUBLIC_SELLER_INBOX_ENABLED;

  afterEach(() => {
    if (prev === undefined) {
      delete process.env.NEXT_PUBLIC_SELLER_INBOX_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_SELLER_INBOX_ENABLED = prev;
    }
  });

  it('defaults off (prod) — route must 404', () => {
    delete process.env.NEXT_PUBLIC_SELLER_INBOX_ENABLED;
    expect(sellerInboxEnabled()).toBe(false);
    expect(sellerInboxRouteAllowed()).toBe(false);
  });

  it('is on only when NEXT_PUBLIC_SELLER_INBOX_ENABLED=true', () => {
    process.env.NEXT_PUBLIC_SELLER_INBOX_ENABLED = 'true';
    expect(sellerInboxEnabled()).toBe(true);
    expect(sellerInboxRouteAllowed()).toBe(true);
  });

  it('treats non-true values as off', () => {
    process.env.NEXT_PUBLIC_SELLER_INBOX_ENABLED = 'false';
    expect(sellerInboxEnabled()).toBe(false);
  });
});
