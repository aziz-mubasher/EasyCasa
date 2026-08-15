import { describe, expect, it, vi } from 'vitest';

import { AsteCreditsService } from './aste-credits.service';

describe('AsteCreditsService (EC-27)', () => {
  it('grantFromStripePurchase is idempotent on payment id', async () => {
    const ledgerKeys = new Set<string>();
    let balance = 0;

    const db = {
      transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const grantTx = {
          insert: vi.fn(() => ({
            values: vi.fn((row: Record<string, unknown>) => ({
              onConflictDoNothing: vi.fn(() => ({
                returning: vi.fn(async () => {
                  const key = row.idempotencyKey as string;
                  if (ledgerKeys.has(key)) return [];
                  ledgerKeys.add(key);
                  balance += row.delta as number;
                  return [{ id: 'ledger-1' }];
                }),
              })),
              onConflictDoUpdate: vi.fn(() => ({
                returning: vi.fn(async () => [{ balance }]),
              })),
            })),
          })),
          select: vi.fn(() => ({
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn(async () => [{ balance }]),
              })),
            })),
          })),
        };
        return fn(grantTx);
      }),
    };

    const audit = { record: vi.fn(async () => ({ id: 'audit-1' })) };
    const analytics = { track: vi.fn() };
    const service = new AsteCreditsService(
      db as never,
      {
        ASTE_ANALYSIS_ENABLED: true,
        PAYMENTS_ENABLED: true,
        STRIPE_PRICE_ASTE_CREDITS_1: '',
        STRIPE_PRICE_ASTE_CREDITS_3: '',
        STRIPE_PRICE_ASTE_CREDITS_10: '',
      } as never,
      audit as never,
      analytics as never,
    );

    const first = await service.grantFromStripePurchase('u1', 3, 'pi_test_1');
    const second = await service.grantFromStripePurchase('u1', 3, 'pi_test_1');
    expect(first.granted).toBe(true);
    expect(second.granted).toBe(false);
    expect(first.balance).toBe(3);
  });

  it('getEntitlement treats monetisation off as fully unlocked', async () => {
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => []),
          })),
        })),
      })),
    };
    const service = new AsteCreditsService(
      db as never,
      {
        ASTE_ANALYSIS_ENABLED: false,
        PAYMENTS_ENABLED: false,
        STRIPE_PRICE_ASTE_CREDITS_1: '',
        STRIPE_PRICE_ASTE_CREDITS_3: '',
        STRIPE_PRICE_ASTE_CREDITS_10: '',
      } as never,
      { record: vi.fn() } as never,
      { track: vi.fn() } as never,
    );
    const ent = await service.getEntitlement('u1', 'a1');
    expect(ent.monetisationEnabled).toBe(false);
    expect(ent.unlocked).toBe(true);
  });

  it('monetisationEnabled requires both flags', () => {
    const db = { select: vi.fn() };
    const off = new AsteCreditsService(
      db as never,
      { ASTE_ANALYSIS_ENABLED: true, PAYMENTS_ENABLED: false } as never,
      { record: vi.fn() } as never,
      { track: vi.fn() } as never,
    );
    expect(off.monetisationEnabled()).toBe(false);
  });
});
