import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetConfigCache } from '../config';
import { PaymentsService } from './payments.service';
import type { PaymentIntentRecord, PaymentProvider, PaymentRepository } from './domain/ports';

const orderLines = [
  { itemCode: 'VALUATION', kind: 'fixed', netCents: 9900, ivaCents: 2178, grossCents: 12078, estimated: false },
];

const order = {
  id: 'order-1',
  propertyId: null,
  listingId: null,
  userId: 'user-1',
  packageCode: null,
  status: 'CONFIRMED' as const,
  itemCodes: ['VALUATION'],
  lines: orderLines,
  dueNowGrossCents: 12078,
  estimatedTotalGrossCents: 12078,
  dueNowNetCents: 9900,
  clientFiscalCode: null,
};

function makeService(deps: {
  repo?: Partial<PaymentRepository>;
  provider?: Partial<PaymentProvider>;
  onSucceeded?: { onPaymentSucceeded: (i: PaymentIntentRecord) => Promise<void> };
  orders?: { get: (id: string) => Promise<typeof order | null> };
}) {
  const repo: PaymentRepository = {
    create: vi.fn(async (input) => ({
      id: 'pi-rec-1',
      orderId: input.orderId,
      purpose: input.purpose,
      amountCents: input.amountCents,
      status: 'REQUIRES_PAYMENT' as const,
      providerRef: null,
    })),
    get: vi.fn(),
    findByProviderRef: vi.fn(),
    setStatus: vi.fn(),
    setProviderRef: vi.fn(),
    ...deps.repo,
  };
  const provider: PaymentProvider = {
    createIntent: vi.fn(async () => ({
      providerRef: 'pi_stripe_1',
      clientSecret: 'cs_test_secret',
    })),
    refund: vi.fn(),
    ...deps.provider,
  };
  const onSucceeded = deps.onSucceeded ?? { onPaymentSucceeded: vi.fn(async () => undefined) };
  const orders = deps.orders ?? { get: vi.fn(async () => order) };

  return {
    service: new PaymentsService(repo, provider, onSucceeded, orders as never),
    repo,
    provider,
    onSucceeded,
  };
}

describe('PaymentsService', () => {
  beforeEach(() => {
    Object.assign(process.env, {
      DEV_AUTH: 'true',
      PAYMENTS_ENABLED: 'false',
      DATABASE_URL: 'postgresql://u:p@127.0.0.1:5432/db',
    });
    resetConfigCache();
  });

  it('createIntent returns client secret from provider (mock Stripe)', async () => {
    const { service, provider } = makeService({});
    const result = await service.createIntent({
      orderId: 'order-1',
      purpose: 'DUE_NOW',
      amountCents: 12078,
    });
    expect(result.clientSecret).toBe('cs_test_secret');
    expect(result.intentId).toBe('pi-rec-1');
    expect(provider.createIntent).toHaveBeenCalled();
  });

  it('rejects PROVVIGIONE purpose on card path', async () => {
    const { service } = makeService({});
    await expect(
      service.createIntent({ orderId: 'order-1', purpose: 'PROVVIGIONE', amountCents: 100 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('marks succeeded idempotently on repeat webhook', async () => {
    const record: PaymentIntentRecord = {
      id: 'pi-rec-1',
      orderId: 'order-1',
      purpose: 'DUE_NOW',
      amountCents: 12078,
      status: 'SUCCEEDED',
      providerRef: 'pi_stripe_1',
    };
    const onSucceeded = { onPaymentSucceeded: vi.fn(async () => undefined) };
    const { service } = makeService({
      repo: {
        findByProviderRef: vi.fn(async () => record),
      },
      onSucceeded,
    });
    await service.handleWebhook({ providerRef: 'pi_stripe_1', type: 'succeeded' });
    expect(onSucceeded.onPaymentSucceeded).not.toHaveBeenCalled();
  });
});
