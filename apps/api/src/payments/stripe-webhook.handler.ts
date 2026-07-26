import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { apiConfig } from '../config';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { stripeWebhookEvents } from '../db/schema';
import { PaymentsService } from './payments.service';

@Injectable()
export class StripePaymentsWebhookHandler {
  private readonly log = new Logger(StripePaymentsWebhookHandler.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly payments: PaymentsService,
  ) {}

  private stripe(): Stripe {
    const key = apiConfig.STRIPE_SECRET_KEY;
    if (!key) throw new BadRequestException('Stripe is not configured');
    return new Stripe(key);
  }

  async handle(rawBody: Buffer, signature: string): Promise<{ received: true }> {
    if (!signature) throw new BadRequestException('missing stripe-signature header');
    const secret = apiConfig.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new BadRequestException('STRIPE_WEBHOOK_SECRET is not configured');

    let event: Stripe.Event;
    try {
      event = this.stripe().webhooks.constructEvent(rawBody, signature, secret);
    } catch (err) {
      throw new BadRequestException(`invalid signature: ${(err as Error).message}`);
    }

    const inserted = await this.db
      .insert(stripeWebhookEvents)
      .values({ id: event.id })
      .onConflictDoNothing()
      .returning({ id: stripeWebhookEvents.id });
    if (inserted.length === 0) {
      this.log.debug(`duplicate Stripe event ${event.id} — skipped`);
      return { received: true };
    }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent;
      await this.payments.handleWebhook({ providerRef: pi.id, type: 'succeeded' });
    } else if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object as Stripe.PaymentIntent;
      await this.payments.handleWebhook({ providerRef: pi.id, type: 'failed' });
    } else {
      this.log.debug(`unhandled Stripe event ${event.type}`);
    }

    return { received: true };
  }
}
