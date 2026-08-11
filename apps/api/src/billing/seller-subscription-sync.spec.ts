/**
 * EC-S-T27 — the webhook-maintained `seller_subscription` row must only track
 * the `seller_premium` plan. Other Stripe subscriptions (basic/pro/agency)
 * share the same `customer.subscription.*` events and must never grant
 * premium-seller entitlements (queue priority / quota raises).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import type Stripe from 'stripe';

import { resetConfigCache } from '../config';
import { memberships, sellerSubscription } from '../db/schema';
import { StripeService } from './stripe.service';
import type { ApiConfig } from '../config/load';
import type { Db } from '../db/drizzle';

function fakeDb() {
  const sellerSubUpserts: Array<Record<string, unknown>> = [];
  const db = {
    select: () => ({
      from: (table: unknown) => ({
        where: () => ({
          limit: async () => (table === memberships ? [] : []),
        }),
      }),
    }),
    insert: (table: unknown) => ({
      values: async (vals: Record<string, unknown>) => {
        if (table === sellerSubscription) sellerSubUpserts.push(vals);
      },
    }),
    update: (table: unknown) => ({
      set: (vals: Record<string, unknown>) => ({
        where: async () => {
          if (table === sellerSubscription) sellerSubUpserts.push(vals);
        },
      }),
    }),
  };
  return { db: db as unknown as Db, sellerSubUpserts };
}

/** Fakes just enough of the Stripe SDK surface `handleWebhook` calls. */
function fakeStripeClient(
  type: 'customer.subscription.updated' | 'customer.subscription.deleted',
  sub: Partial<Stripe.Subscription>,
): Stripe {
  const event = { type, data: { object: sub } } as unknown as Stripe.Event;
  return {
    subscriptions: { retrieve: async () => sub as Stripe.Subscription },
    webhooks: { constructEvent: () => event },
  } as unknown as Stripe;
}

describe('StripeService — seller_subscription plan gating (T27)', () => {
  beforeEach(() => {
    Object.assign(process.env, {
      ALLOW_PROVIDER_STUBS: 'true',
      EC_TEST_AUTH: 'true',
      DATABASE_URL: 'postgresql://u:p@127.0.0.1:5432/db',
      WA_HANDLE_SECRET: 'test-wa-handle-secret-xx',
    });
    resetConfigCache();
  });

  it('customer.subscription.updated for a non-premium plan does NOT touch seller_subscription', async () => {
    const { db, sellerSubUpserts } = fakeDb();
    const svc = new StripeService(db, { SELLER_PREMIUM_ENABLED: true } as ApiConfig);
    const sub: Partial<Stripe.Subscription> = {
      id: 'sub_basic_1',
      status: 'active',
      current_period_end: Math.floor(Date.now() / 1000) + 86_400,
      cancel_at_period_end: false,
      customer: 'cus_1',
      metadata: { userId: 'user-1', planKey: 'basic' },
    };
    (svc as unknown as { client: Stripe }).client = fakeStripeClient(
      'customer.subscription.updated',
      sub,
    );

    await svc.handleWebhook(Buffer.from('{}'), 'sig');
    expect(sellerSubUpserts).toHaveLength(0);
  });

  it('customer.subscription.updated for seller_premium upserts seller_subscription', async () => {
    const { db, sellerSubUpserts } = fakeDb();
    const svc = new StripeService(db, { SELLER_PREMIUM_ENABLED: true } as ApiConfig);
    const sub: Partial<Stripe.Subscription> = {
      id: 'sub_premium_1',
      status: 'past_due',
      current_period_end: Math.floor(Date.now() / 1000) + 86_400,
      cancel_at_period_end: false,
      customer: 'cus_2',
      metadata: { userId: 'user-2', planKey: 'seller_premium' },
    };
    (svc as unknown as { client: Stripe }).client = fakeStripeClient(
      'customer.subscription.updated',
      sub,
    );

    await svc.handleWebhook(Buffer.from('{}'), 'sig');
    expect(sellerSubUpserts).toHaveLength(1);
    expect(sellerSubUpserts[0]).toMatchObject({ userId: 'user-2', status: 'past_due' });
  });

  it('customer.subscription.deleted for seller_premium maps to canceled', async () => {
    const { db, sellerSubUpserts } = fakeDb();
    const svc = new StripeService(db, { SELLER_PREMIUM_ENABLED: true } as ApiConfig);
    const sub: Partial<Stripe.Subscription> = {
      id: 'sub_premium_2',
      status: 'canceled',
      current_period_end: Math.floor(Date.now() / 1000) - 86_400,
      cancel_at_period_end: false,
      customer: 'cus_3',
      metadata: { userId: 'user-3', planKey: 'seller_premium' },
    };
    (svc as unknown as { client: Stripe }).client = fakeStripeClient(
      'customer.subscription.deleted',
      sub,
    );

    await svc.handleWebhook(Buffer.from('{}'), 'sig');
    expect(sellerSubUpserts).toHaveLength(1);
    expect(sellerSubUpserts[0]).toMatchObject({ userId: 'user-3', status: 'canceled' });
  });
});
