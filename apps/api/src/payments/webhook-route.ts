/**
 * EC-APP-1-API-WEBHOOK — who may post to /payments/webhook.
 *
 * A payment-state change is never accepted without a Stripe signature,
 * except a local DEV JSON body behind an explicit flag that defaults off.
 * Production never takes that DEV body, whatever PAYMENTS_ENABLED is.
 */

export type PaymentWebhookDecision =
  | { action: 'stripe' }
  | { action: 'dev' }
  | { action: 'reject'; reason: string };

export function decidePaymentWebhook(input: {
  nodeEnv: string;
  paymentsEnabled: boolean;
  devWebhook: boolean;
  hasSignature: boolean;
}): PaymentWebhookDecision {
  const production = input.nodeEnv === 'production';

  if (production && !input.hasSignature) {
    return { action: 'reject', reason: 'production_unsigned' };
  }

  if (input.paymentsEnabled) {
    return { action: 'stripe' };
  }

  if (production) {
    return { action: 'reject', reason: 'production_dev_webhook_disabled' };
  }

  if (!input.devWebhook) {
    return { action: 'reject', reason: 'dev_webhook_flag_off' };
  }

  return { action: 'dev' };
}

/** Last IPv4 octet, or the tail of an IPv6 address, dropped before the log line. */
export function truncateIp(raw: string | undefined | null): string {
  if (!raw) return 'unknown';
  const ip = raw.split(',')[0]?.trim() ?? '';
  if (!ip) return 'unknown';
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p))) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
    return 'unknown';
  }
  if (ip.includes(':')) {
    const parts = ip.split(':').filter((p) => p.length > 0);
    if (parts.length === 0) return 'unknown';
    return `${parts.slice(0, Math.min(3, parts.length)).join(':')}::`;
  }
  return 'unknown';
}
