import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { apiConfig } from '../config';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { plans, memberships, featuredPlacements, listings } from '../db/schema';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private client: Stripe | null | undefined;

  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  private stripe(): Stripe {
    if (this.client === undefined) {
      this.client = apiConfig.STRIPE_SECRET_KEY
        ? new Stripe(apiConfig.STRIPE_SECRET_KEY)
        : null;
    }
    if (!this.client) throw new BadRequestException('billing not configured');
    return this.client;
  }

  listPlans() {
    return this.db.select().from(plans);
  }

  /** Subscription checkout (Stripe-hosted). Returns the redirect URL. */
  async createSubscriptionCheckout(userId: string, email: string | undefined, planKey: string): Promise<string> {
    const planRows = await this.db.select().from(plans).where(eq(plans.key, planKey)).limit(1);
    const plan = planRows[0];
    if (!plan?.stripePriceId) throw new BadRequestException('plan not purchasable');

    const customerId = await this.ensureCustomer(userId, email);
    const session = await this.stripe().checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      client_reference_id: userId,
      success_url: apiConfig.BILLING_SUCCESS_URL,
      cancel_url: apiConfig.BILLING_CANCEL_URL,
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true }, // collect P.Iva/VAT for EU invoicing
      subscription_data: { metadata: { userId, planKey } },
    });
    return session.url ?? '';
  }

  /** One-time payment to feature a listing for N days. */
  async createFeaturedCheckout(listingId: string, days: number): Promise<string> {
    const priceCents = days * 200; // €2/day — configure per market
    const session = await this.stripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: apiConfig.CURRENCY,
            unit_amount: priceCents,
            product_data: { name: `Featured listing (${days} days)` },
          },
          quantity: 1,
        },
      ],
      success_url: apiConfig.BILLING_SUCCESS_URL,
      cancel_url: apiConfig.BILLING_CANCEL_URL,
      metadata: { listingId, days: String(days), kind: 'featured' },
    });
    return session.url ?? '';
  }

  async createPortalSession(userId: string): Promise<string> {
    const m = await this.db.select().from(memberships).where(eq(memberships.userId, userId)).limit(1);
    const customerId = m[0]?.stripeCustomerId;
    if (!customerId) throw new BadRequestException('no billing account');
    const portal = await this.stripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: apiConfig.BILLING_SUCCESS_URL,
    });
    return portal.url;
  }

  private async ensureCustomer(userId: string, email: string | undefined): Promise<string> {
    const existing = await this.db.select().from(memberships).where(eq(memberships.userId, userId)).limit(1);
    if (existing[0]?.stripeCustomerId) return existing[0].stripeCustomerId;
    const customer = await this.stripe().customers.create({ email, metadata: { userId } });
    if (existing[0]) {
      await this.db.update(memberships).set({ stripeCustomerId: customer.id }).where(eq(memberships.id, existing[0].id));
    } else {
      await this.db.insert(memberships).values({ userId, tier: 'free', status: 'inactive', stripeCustomerId: customer.id });
    }
    return customer.id;
  }

  /** Verify + process a Stripe webhook. rawBody is the exact bytes received. */
  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;
    try {
      event = this.stripe().webhooks.constructEvent(rawBody, signature, apiConfig.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      throw new BadRequestException(`invalid signature: ${(err as Error).message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object;
        if (s.mode === 'subscription' && s.client_reference_id) {
          await this.activateMembership(s.client_reference_id, s.subscription as string, s.customer as string);
        } else if (s.mode === 'payment' && s.metadata?.kind === 'featured') {
          await this.activateFeatured(s.metadata.listingId, Number(s.metadata.days ?? 7), s.payment_intent as string);
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await this.syncSubscription(sub);
        break;
      }
      default:
        this.logger.debug(`unhandled event ${event.type}`);
    }
  }

  private async activateMembership(userId: string, subscriptionId: string, customerId: string) {
    const sub = await this.stripe().subscriptions.retrieve(subscriptionId);
    const planKey = (sub.metadata?.planKey as string) ?? 'basic';
    const periodEnd = new Date(sub.current_period_end * 1000);
    const existing = await this.db.select().from(memberships).where(eq(memberships.userId, userId)).limit(1);
    const values = {
      userId, tier: planKey, status: 'active',
      stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId, currentPeriodEnd: periodEnd,
    };
    if (existing[0]) {
      await this.db.update(memberships).set(values).where(eq(memberships.id, existing[0].id));
    } else {
      await this.db.insert(memberships).values(values);
    }
  }

  private async syncSubscription(sub: Stripe.Subscription) {
    const status = sub.status === 'active' || sub.status === 'trialing' ? 'active' : 'inactive';
    await this.db
      .update(memberships)
      .set({ status, currentPeriodEnd: new Date(sub.current_period_end * 1000) })
      .where(eq(memberships.stripeSubscriptionId, sub.id));
  }

  private async activateFeatured(listingId: string, days: number, paymentId: string) {
    const endsAt = new Date(Date.now() + days * 86_400_000);
    await this.db.insert(featuredPlacements).values({ listingId, kind: 'featured', endsAt, stripePaymentId: paymentId });
    await this.db.update(listings).set({ featuredUntil: endsAt }).where(eq(listings.id, listingId));
  }
}
