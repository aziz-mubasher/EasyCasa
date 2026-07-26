import { BadRequestException, Injectable } from '@nestjs/common';
import Stripe from 'stripe';

import { apiConfig } from '../config';
import type { PaymentProvider } from './domain/ports';

@Injectable()
export class StripePaymentProvider implements PaymentProvider {
  private client(): Stripe {
    const key = apiConfig.STRIPE_SECRET_KEY;
    if (!key) throw new BadRequestException('Stripe is not configured');
    return new Stripe(key);
  }

  async createIntent(input: {
    amountCents: number;
    currency: 'eur';
    reference: string;
  }): Promise<{ providerRef: string; clientSecret: string }> {
    const intent = await this.client().paymentIntents.create({
      amount: input.amountCents,
      currency: input.currency,
      automatic_payment_methods: { enabled: true },
      metadata: { paymentIntentRecordId: input.reference },
    });
    if (!intent.client_secret) {
      throw new BadRequestException('Stripe did not return a client secret');
    }
    return { providerRef: intent.id, clientSecret: intent.client_secret };
  }

  async refund(providerRef: string): Promise<void> {
    await this.client().refunds.create({ payment_intent: providerRef });
  }
}
