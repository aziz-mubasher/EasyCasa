import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetConfigCache } from '../config';
import { StripePaymentsWebhookHandler } from './stripe-webhook.handler';
import type { PaymentsService } from './payments.service';

describe('StripePaymentsWebhookHandler', () => {
  beforeEach(() => {
    Object.assign(process.env, {
      ALLOW_PROVIDER_STUBS: 'true', EC_TEST_AUTH: 'true',
      DATABASE_URL: 'postgresql://u:p@127.0.0.1:5432/db',
      WA_HANDLE_SECRET: 'test-wa-handle-secret-xx',
      PAYMENTS_ENABLED: 'true',
      STRIPE_SECRET_KEY: 'sk_test_x',
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
    });
    resetConfigCache();
  });

  it('rejects missing stripe-signature header', async () => {
    const db = {
      insert: vi.fn(),
    };
    const payments = { handleWebhook: vi.fn() } as unknown as PaymentsService;
    const handler = new StripePaymentsWebhookHandler(db as never, payments);
    await expect(handler.handle(Buffer.from('{}'), '')).rejects.toBeInstanceOf(BadRequestException);
  });
});
