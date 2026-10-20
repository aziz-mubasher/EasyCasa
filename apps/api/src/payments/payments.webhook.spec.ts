import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetConfigCache } from '../config';
import { PaymentsController } from './payments.controller';
import type { PaymentsService } from './payments.service';
import type { StripePaymentsWebhookHandler } from './stripe-webhook.handler';

const ENV_KEYS = [
  'NODE_ENV',
  'PAYMENTS_ENABLED',
  'PAYMENTS_DEV_WEBHOOK',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'DATABASE_URL',
  'ALLOW_PROVIDER_STUBS',
  'EC_TEST_AUTH',
  'WA_HANDLE_SECRET',
] as const;

function boot(overrides: Record<string, string | undefined>) {
  for (const key of ENV_KEYS) delete process.env[key];
  Object.assign(process.env, {
    DATABASE_URL: 'postgresql://u:p@127.0.0.1:5432/db',
    ALLOW_PROVIDER_STUBS: 'true',
    EC_TEST_AUTH: 'true',
    WA_HANDLE_SECRET: 'test-wa-handle-secret-xx',
    ...overrides,
  });
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
  }
  resetConfigCache();
}

function req(ip = '203.0.113.44') {
  return { ip, body: { providerRef: 'dev_pi_abc', type: 'succeeded' }, rawBody: Buffer.from('{}') };
}

describe('POST /payments/webhook', () => {
  const saved: Record<string, string | undefined> = {};
  let handleWebhook: ReturnType<typeof vi.fn>;
  let stripeHandle: ReturnType<typeof vi.fn>;
  let controller: PaymentsController;

  beforeEach(() => {
    for (const key of ENV_KEYS) saved[key] = process.env[key];
    handleWebhook = vi.fn().mockResolvedValue(undefined);
    stripeHandle = vi.fn().mockResolvedValue({ received: true });
    controller = new PaymentsController(
      { handleWebhook } as unknown as PaymentsService,
      { handle: stripeHandle } as unknown as StripePaymentsWebhookHandler,
    );
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    resetConfigCache();
    vi.restoreAllMocks();
  });

  it('production + payments off + unsigned POST does not call handleWebhook', async () => {
    boot({ NODE_ENV: 'production', PAYMENTS_ENABLED: 'false', PAYMENTS_DEV_WEBHOOK: 'true' });
    await expect(
      controller.webhook(req() as never, undefined),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(handleWebhook).not.toHaveBeenCalled();
    expect(stripeHandle).not.toHaveBeenCalled();
  });

  it('production + payments on + missing signature is rejected', async () => {
    boot({
      NODE_ENV: 'production',
      PAYMENTS_ENABLED: 'true',
      STRIPE_SECRET_KEY: 'sk_test_x',
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
    });
    await expect(
      controller.webhook(req() as never, undefined),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(handleWebhook).not.toHaveBeenCalled();
    expect(stripeHandle).not.toHaveBeenCalled();
  });

  it('production + payments on + bad signature is rejected by Stripe verification', async () => {
    boot({
      NODE_ENV: 'production',
      PAYMENTS_ENABLED: 'true',
      STRIPE_SECRET_KEY: 'sk_test_x',
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
    });
    stripeHandle.mockRejectedValue(new BadRequestException('invalid signature'));
    await expect(
      controller.webhook(req() as never, 't=1,v1=bad'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(handleWebhook).not.toHaveBeenCalled();
    expect(stripeHandle).toHaveBeenCalledOnce();
  });

  it('non-production + PAYMENTS_DEV_WEBHOOK off rejects and does not call handleWebhook', async () => {
    boot({ NODE_ENV: 'test', PAYMENTS_ENABLED: 'false', PAYMENTS_DEV_WEBHOOK: 'false' });
    await expect(
      controller.webhook(req() as never, undefined),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(handleWebhook).not.toHaveBeenCalled();
  });

  it('non-production + PAYMENTS_DEV_WEBHOOK on runs the unsigned DEV body', async () => {
    boot({ NODE_ENV: 'development', PAYMENTS_ENABLED: 'false', PAYMENTS_DEV_WEBHOOK: 'true' });
    await expect(controller.webhook(req() as never, undefined)).resolves.toEqual({ received: true });
    expect(handleWebhook).toHaveBeenCalledWith({
      providerRef: 'dev_pi_abc',
      type: 'succeeded',
    });
    expect(stripeHandle).not.toHaveBeenCalled();
  });

  it('logs a truncated IP and a reason, not the body', async () => {
    boot({ NODE_ENV: 'production', PAYMENTS_ENABLED: 'false' });
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    await expect(controller.webhook(req('198.51.100.23') as never, undefined)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    const line = warn.mock.calls.map((c) => String(c[0])).join('\n');
    expect(line).toContain('ip=198.51.100.0');
    expect(line).toContain('reason=production_unsigned');
    expect(line).not.toContain('dev_pi_abc');
    expect(line).not.toContain('198.51.100.23');
  });
});
