import { describe, expect, it } from 'vitest';

import { decidePaymentWebhook, truncateIp } from './webhook-route';

describe('decidePaymentWebhook', () => {
  it('rejects an unsigned POST in production even when payments are off', () => {
    expect(
      decidePaymentWebhook({
        nodeEnv: 'production',
        paymentsEnabled: false,
        devWebhook: true,
        hasSignature: false,
      }),
    ).toEqual({ action: 'reject', reason: 'production_unsigned' });
  });

  it('rejects an unsigned POST in production when payments are on', () => {
    expect(
      decidePaymentWebhook({
        nodeEnv: 'production',
        paymentsEnabled: true,
        devWebhook: false,
        hasSignature: false,
      }),
    ).toEqual({ action: 'reject', reason: 'production_unsigned' });
  });

  it('sends a signed production request to Stripe when payments are on', () => {
    expect(
      decidePaymentWebhook({
        nodeEnv: 'production',
        paymentsEnabled: true,
        devWebhook: false,
        hasSignature: true,
      }),
    ).toEqual({ action: 'stripe' });
  });

  it('rejects a signed production request when payments are off', () => {
    expect(
      decidePaymentWebhook({
        nodeEnv: 'production',
        paymentsEnabled: false,
        devWebhook: true,
        hasSignature: true,
      }),
    ).toEqual({ action: 'reject', reason: 'production_dev_webhook_disabled' });
  });

  it('rejects outside production when the DEV flag is off', () => {
    expect(
      decidePaymentWebhook({
        nodeEnv: 'test',
        paymentsEnabled: false,
        devWebhook: false,
        hasSignature: false,
      }),
    ).toEqual({ action: 'reject', reason: 'dev_webhook_flag_off' });
  });

  it('allows the DEV JSON body only outside production with the flag on', () => {
    expect(
      decidePaymentWebhook({
        nodeEnv: 'development',
        paymentsEnabled: false,
        devWebhook: true,
        hasSignature: false,
      }),
    ).toEqual({ action: 'dev' });
  });

  it('keeps the Stripe path outside production when payments are on', () => {
    expect(
      decidePaymentWebhook({
        nodeEnv: 'test',
        paymentsEnabled: true,
        devWebhook: true,
        hasSignature: false,
      }),
    ).toEqual({ action: 'stripe' });
  });
});

describe('truncateIp', () => {
  it('zeroes the last IPv4 octet and drops an IPv6 tail', () => {
    expect(truncateIp('203.0.113.44')).toBe('203.0.113.0');
    expect(truncateIp('203.0.113.44, 10.0.0.1')).toBe('203.0.113.0');
    expect(truncateIp('2001:db8:85a3::8a2e:370:7334')).toBe('2001:db8:85a3::');
    expect(truncateIp(undefined)).toBe('unknown');
  });
});
