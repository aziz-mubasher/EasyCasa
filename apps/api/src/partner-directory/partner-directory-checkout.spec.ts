/**
 * PP-1 / K EC 1.50 — partner directory self-serve Stripe checkout.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type Stripe from 'stripe';

import { resetConfigCache } from '../config';
import { plans } from '../db/schema';
import { StripeService } from '../billing/stripe.service';
import { PartnerDirectoryService } from './partner-directory.service';
import type { ApiConfig } from '../config/load';
import type { Db } from '../db/drizzle';

const PARTNER_ID = '11111111-1111-1111-1111-111111111111';
const USER_ID = '22222222-2222-2222-2222-222222222222';

function stubBoostSearch() {
  return {
    boosts: {
      cancelByPaymentRef: async () => [] as string[],
      activateFromPayment: async () => undefined,
      boostWeightForListing: async () => 0,
    },
    search: { patchBoost: async () => undefined },
  };
}

describe('PartnerDirectoryService — PP-1', () => {
  it('listPublic sorts paid rows first (G3 counsel)', async () => {
    const rows = [
      {
        id: 'a',
        category: 'notaio',
        name: 'Free',
        province: 'mi',
        credentials: null,
        contact: 'a@example.com',
        paidPlacement: false,
        operatorManaged: false,
      },
      {
        id: 'b',
        category: 'notaio',
        name: 'Paid',
        province: 'mi',
        credentials: null,
        contact: 'b@example.com',
        paidPlacement: true,
        operatorManaged: false,
      },
    ];
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: async () => rows.sort((x, y) => Number(y.paidPlacement) - Number(x.paidPlacement)),
          }),
        }),
      }),
    } as unknown as Db;
    const svc = new PartnerDirectoryService(db);
    const res = await svc.listPublic({});
    expect(res.items[0]?.paidPlacement).toBe(true);
    expect(res.labelKey).toBe('partnerDirectory.paidListingLabel');
  });

  it('activatePaidPlacement is idempotent for same payment id', async () => {
    let paid = false;
    let paymentId: string | null = null;
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: PARTNER_ID,
                paidPlacement: paid,
                stripePaymentId: paymentId,
              },
            ],
          }),
        }),
      }),
      update: () => ({
        set: (vals: { paidPlacement: boolean; stripePaymentId: string }) => ({
          where: async () => {
            paid = vals.paidPlacement;
            paymentId = vals.stripePaymentId;
          },
        }),
      }),
    } as unknown as Db;
    const svc = new PartnerDirectoryService(db);
    const first = await svc.activatePaidPlacement(PARTNER_ID, 'pi_test_1');
    const second = await svc.activatePaidPlacement(PARTNER_ID, 'pi_test_1');
    expect(first.activated).toBe(true);
    expect(second.activated).toBe(false);
    expect(second.reason).toBe('already_paid');
    expect(paid).toBe(true);
  });
});

describe('StripeService — partner directory checkout (PP-1)', () => {
  beforeEach(() => {
    Object.assign(process.env, {
      ALLOW_PROVIDER_STUBS: 'true',
      EC_TEST_AUTH: 'true',
      DATABASE_URL: 'postgresql://u:p@127.0.0.1:5432/db',
      WA_HANDLE_SECRET: 'test-wa-handle-secret-xx',
      STRIPE_SECRET_KEY: 'sk_test_fake',
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
    });
    resetConfigCache();
  });

  it('createPartnerDirectoryCheckout rejects when plan stripe_price_id empty', async () => {
    const db = {
      select: () => ({
        from: (table: unknown) => ({
          where: () => ({
            limit: async () =>
              table === plans
                ? [{ key: 'partner_directory_placement', stripePriceId: null }]
                : [
                    {
                      id: PARTNER_ID,
                      userId: USER_ID,
                      active: true,
                      paidPlacement: false,
                    },
                  ],
          }),
        }),
      }),
    } as unknown as Db;
    const { boosts, search } = stubBoostSearch();
    const svc = new StripeService(
      db,
      { PARTNER_DIRECTORY_ENABLED: true } as ApiConfig,
      boosts as never,
      search as never,
    );
    (svc as unknown as { client: Stripe }).client = {
      checkout: { sessions: { create: vi.fn() } },
    } as unknown as Stripe;

    await expect(
      svc.createPartnerDirectoryCheckout(PARTNER_ID, USER_ID),
    ).rejects.toThrow(/not purchasable/);
  });

  it('webhook checkout.session.completed flips paid_placement (idempotent)', async () => {
    let paid = false;
    let storedPayment: string | null = null;
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: PARTNER_ID,
                userId: USER_ID,
                active: true,
                paidPlacement: paid,
                stripePaymentId: storedPayment,
              },
            ],
          }),
        }),
      }),
      update: () => ({
        set: (vals: { paidPlacement: boolean; stripePaymentId: string }) => ({
          where: async () => {
            paid = vals.paidPlacement;
            storedPayment = vals.stripePaymentId;
          },
        }),
      }),
    } as unknown as Db;
    const { boosts, search } = stubBoostSearch();
    const svc = new StripeService(
      db,
      { PARTNER_DIRECTORY_ENABLED: true } as ApiConfig,
      boosts as never,
      search as never,
    );
    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          mode: 'payment',
          metadata: { kind: 'partner_directory', partnerDirectoryId: PARTNER_ID },
          payment_intent: 'pi_partner_1',
        },
      },
    } as unknown as Stripe.Event;
    (svc as unknown as { client: Stripe }).client = {
      webhooks: { constructEvent: () => event },
    } as unknown as Stripe;

    await svc.handleWebhook(Buffer.from('{}'), 'sig');
    expect(paid).toBe(true);
    expect(storedPayment).toBe('pi_partner_1');

    await svc.handleWebhook(Buffer.from('{}'), 'sig');
    expect(paid).toBe(true);
  });
});

describe('PP-1 migration plan seed', () => {
  it('seeds partner_directory_placement with empty stripe_price_id', () => {
    const sql = readFileSync(
      join(__dirname, '../../../../migration/sql/0065_ecs_pp1_partner_directory_checkout.sql'),
      'utf8',
    );
    expect(sql).toMatch(/partner_directory_placement/);
    expect(sql).toMatch(/stripe_price_id[\s\S]*NULL/);
    expect(sql).toMatch(/price_cents[\s\S]*\n\s*0,/);
  });
});
