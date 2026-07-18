/**
 * Payment confirmation seam.
 *
 * Production: call the PSP React Native SDK with the client secret from
 * createIntent. EasyCasa never touches card data; success is confirmed by the
 * Phase 17 provider webhook — the checkout polls the intent for SUCCEEDED.
 *
 * DEV (clientSecret starts with `dev_secret_`): posts a synthetic webhook so
 * the checkout → mandate flow is exercisable without a real PSP SDK.
 */
import { config } from '../config';

export interface ConfirmResult {
  status: 'succeeded' | 'processing' | 'failed';
  error?: string;
}

export async function confirmPayment(clientSecret: string): Promise<ConfirmResult> {
  if (!clientSecret) return { status: 'failed', error: 'Missing client secret' };

  if (clientSecret.startsWith('dev_secret_')) {
    const digest = clientSecret.slice('dev_secret_'.length).split('_')[0];
    if (!digest) return { status: 'failed', error: 'Invalid DEV client secret' };
    const providerRef = `dev_pi_${digest}`;
    try {
      const res = await fetch(`${config.apiBaseUrl}/payments/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ providerRef, type: 'succeeded' }),
      });
      if (!res.ok) {
        return { status: 'failed', error: `DEV webhook ${res.status}` };
      }
    } catch (err) {
      return {
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      };
    }
    // Still poll — webhook is the source of truth.
    return { status: 'processing' };
  }

  // TODO(integration): present Stripe / Nexi / PayPal payment sheet with clientSecret.
  return { status: 'processing' };
}
