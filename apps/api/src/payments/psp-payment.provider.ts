import { Injectable } from '@nestjs/common';
import { createHmac, randomUUID } from 'node:crypto';

import { apiConfig } from '../config';
import type { PaymentProvider } from './domain/ports';

/**
 * Generic PSP seam (Stripe / Nexi / PayPal / Satispay). DEV_AUTH stubs a
 * client secret when PSP_* is unset so local checkout can proceed.
 */
@Injectable()
export class PspPaymentProvider implements PaymentProvider {
  async createIntent(input: {
    amountCents: number;
    currency: 'eur';
    reference: string;
  }): Promise<{ providerRef: string; clientSecret: string }> {
    const key = apiConfig.PSP_SECRET_KEY;
    const url = apiConfig.PSP_API_URL;

    if (!key || !url) {
      if (!apiConfig.DEV_AUTH) {
        throw new Error('Payment provider is not configured (PSP_API_URL / PSP_SECRET_KEY)');
      }
      const digest = createHmac('sha256', 'dev-psp')
        .update(`${input.reference}:${input.amountCents}`)
        .digest('hex')
        .slice(0, 16);
      return {
        providerRef: `dev_pi_${digest}`,
        clientSecret: `dev_secret_${digest}_${randomUUID().slice(0, 8)}`,
      };
    }

    const res = await fetch(`${url}/intents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`PSP error ${res.status}`);
    return (await res.json()) as { providerRef: string; clientSecret: string };
  }

  async refund(providerRef: string): Promise<void> {
    const key = apiConfig.PSP_SECRET_KEY;
    const url = apiConfig.PSP_API_URL;
    if (!key || !url) {
      if (!apiConfig.DEV_AUTH) {
        throw new Error('Payment provider is not configured (PSP_API_URL / PSP_SECRET_KEY)');
      }
      return;
    }
    const res = await fetch(`${url}/refunds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ providerRef }),
    });
    if (!res.ok) throw new Error(`PSP refund error ${res.status}`);
  }
}
