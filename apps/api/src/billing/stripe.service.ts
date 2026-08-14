import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import {
  boostFlatPriceCents,
  isBoostDurationDays,
  type BoostDurationDays,
  type SubscriptionStatus,
} from '@easycasa/shared';

import { apiConfig } from '../config';
import { APP_CONFIG } from '../config/config.module';
import type { ApiConfig } from '../config/load';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import {
  plans,
  memberships,
  sellerSubscription,
  featuredPlacements,
  partnerDirectory,
} from '../db/schema';
import { ListingBoostService } from '../listing-boost/listing-boost.service';
import { SearchService } from '../search/search.service';

const SELLER_PREMIUM_PLAN_KEY = 'seller_premium';
const PARTNER_DIRECTORY_PLAN_KEY = 'partner_directory_placement';

function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
      return 'past_due';
    default:
      return 'canceled';
  }
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly client: Stripe | null =
    apiConfig.STRIPE_SECRET_KEY ? new Stripe(apiConfig.STRIPE_SECRET_KEY) : null;

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: ApiConfig,
    private readonly boosts: ListingBoostService,
    private readonly search: SearchService,
  ) {}

  private stripe(): Stripe {
    if (!this.client) throw new BadRequestException('billing not configured');
    return this.client;
  }

  listPlans() {
    return this.db.select().from(plans);
  }

  /** Subscription checkout (Stripe-hosted). Returns the redirect URL. */
  async createSubscriptionCheckout(
    userId: string,
    email: string | undefined,
    planKey: string,
  ): Promise<string> {
    if (planKey === SELLER_PREMIUM_PLAN_KEY && !this.config.SELLER_PREMIUM_ENABLED) {
      throw new NotFoundException('seller premium not available');
    }

    const planRows = await this.db.select().from(plans).where(eq(plans.key, planKey)).limit(1);
    const plan = planRows[0];
    if (!plan?.stripePriceId) throw new BadRequestException('plan not purchasable');

    // T04 row 8: subscription prices must be fixed Stripe Price IDs (flat fee), never listing-derived.
    if (plan.priceCents <= 0 && planKey === SELLER_PREMIUM_PLAN_KEY) {
      throw new BadRequestException('seller premium plan misconfigured');
    }

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

  /**
   * EC-S-T26 — flat-fee boost checkout for 7 or 30 days only.
   * Uses Stripe Price IDs when configured; otherwise fixed price_data unit_amount.
   */
  async createFeaturedCheckout(listingId: string, days: number): Promise<string> {
    if (!isBoostDurationDays(days)) {
      throw new BadRequestException('boost duration must be 7 or 30 days');
    }
    const duration = days as BoostDurationDays;
    const unitAmount = boostFlatPriceCents(duration);
    const priceId =
      duration === 7
        ? this.config.STRIPE_PRICE_BOOST_7D.trim()
        : this.config.STRIPE_PRICE_BOOST_30D.trim();

    const lineItem = priceId
      ? { price: priceId, quantity: 1 as const }
      : {
          price_data: {
            currency: apiConfig.CURRENCY,
            unit_amount: unitAmount,
            product_data: { name: `Listing boost (${duration} days)` },
          },
          quantity: 1 as const,
        };

    const session = await this.stripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [lineItem],
      success_url: apiConfig.BILLING_SUCCESS_URL,
      cancel_url: apiConfig.BILLING_CANCEL_URL,
      metadata: {
        listingId,
        days: String(duration),
        kind: 'featured',
        flatFeeCents: String(unitAmount),
      },
    });
    return session.url ?? '';
  }

  /** PP-1 — flat-fee partner directory placement (one-time payment, perpetual). */
  async createPartnerDirectoryCheckout(partnerDirectoryId: string, userId: string): Promise<string> {
    if (!this.config.PARTNER_DIRECTORY_ENABLED) {
      throw new NotFoundException('partner directory not available');
    }
    const planRows = await this.db
      .select()
      .from(plans)
      .where(eq(plans.key, PARTNER_DIRECTORY_PLAN_KEY))
      .limit(1);
    const plan = planRows[0];
    if (!plan?.stripePriceId?.trim()) throw new BadRequestException('plan not purchasable');

    const row = await this.findOwnedPartnerDirectory(partnerDirectoryId, userId);
    if (!row.active) throw new BadRequestException('listing is inactive');
    if (row.paidPlacement) throw new BadRequestException('listing already has paid placement');

    const session = await this.stripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: apiConfig.BILLING_SUCCESS_URL,
      cancel_url: apiConfig.BILLING_CANCEL_URL,
      metadata: {
        kind: 'partner_directory',
        partnerDirectoryId,
        userId,
      },
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
    const existing = await this.db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, userId))
      .limit(1);
    if (existing[0]?.stripeCustomerId) return existing[0].stripeCustomerId;
    const customer = await this.stripe().customers.create({ email, metadata: { userId } });
    if (existing[0]) {
      await this.db
        .update(memberships)
        .set({ stripeCustomerId: customer.id })
        .where(eq(memberships.id, existing[0].id));
    } else {
      await this.db.insert(memberships).values({
        userId,
        tier: 'free',
        status: 'inactive',
        stripeCustomerId: customer.id,
      });
    }
    return customer.id;
  }

  /** Verify + process a Stripe webhook. rawBody is the exact bytes received. */
  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;
    try {
      event = this.stripe().webhooks.constructEvent(
        rawBody,
        signature,
        apiConfig.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      throw new BadRequestException(`invalid signature: ${(err as Error).message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object;
        if (s.mode === 'subscription' && s.client_reference_id) {
          await this.activateMembership(
            s.client_reference_id,
            s.subscription as string,
            s.customer as string,
          );
        } else if (s.mode === 'payment' && s.metadata?.kind === 'featured') {
          await this.activateFeatured(
            s.metadata.listingId,
            Number(s.metadata.days ?? 7),
            (s.payment_intent as string) || s.id,
          );
        } else if (s.mode === 'payment' && s.metadata?.kind === 'partner_directory') {
          await this.activatePartnerDirectory(
            s.metadata.partnerDirectoryId,
            (s.payment_intent as string) || s.id,
          );
        }
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object;
        const pi =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent?.id;
        if (pi) {
          const listingIds = await this.boosts.cancelByPaymentRef(pi);
          for (const id of listingIds) {
            await this.search.patchBoost(id, 0, false);
          }
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await this.syncSubscription(sub, event.type === 'customer.subscription.deleted');
        break;
      }
      default:
        this.logger.debug(`unhandled event ${event.type}`);
    }
  }

  private async activateMembership(
    userId: string,
    subscriptionId: string,
    customerId: string,
  ) {
    const sub = await this.stripe().subscriptions.retrieve(subscriptionId);
    const planKey = (sub.metadata?.planKey as string) ?? 'basic';
    const periodEnd = new Date(sub.current_period_end * 1000);
    const existing = await this.db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, userId))
      .limit(1);
    const values = {
      userId,
      tier: planKey,
      status: 'active',
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      currentPeriodEnd: periodEnd,
    };
    if (existing[0]) {
      await this.db.update(memberships).set(values).where(eq(memberships.id, existing[0].id));
    } else {
      await this.db.insert(memberships).values(values);
    }
    // Only the seller_premium plan feeds seller entitlements — other plans
    // (basic/pro/agency) must never grant premium-seller quota/priority.
    if (planKey === SELLER_PREMIUM_PLAN_KEY) {
      await this.upsertSellerSubscription({
        userId,
        status: mapStripeSubscriptionStatus(sub.status),
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customerId,
      });
    }
  }

  private async syncSubscription(sub: Stripe.Subscription, deleted: boolean) {
    const membershipStatus =
      !deleted && (sub.status === 'active' || sub.status === 'trialing')
        ? 'active'
        : 'inactive';
    await this.db
      .update(memberships)
      .set({
        status: membershipStatus,
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
      })
      .where(eq(memberships.stripeSubscriptionId, sub.id));

    const userId =
      (typeof sub.metadata?.userId === 'string' && sub.metadata.userId) ||
      (
        await this.db
          .select({ userId: memberships.userId })
          .from(memberships)
          .where(eq(memberships.stripeSubscriptionId, sub.id))
          .limit(1)
      )[0]?.userId;

    if (!userId) {
      this.logger.warn(`seller_subscription sync skipped — no user for ${sub.id}`);
      return;
    }

    // Metadata is copied onto the Subscription at creation (subscription_data.metadata)
    // and persists across its lifecycle, including cancellation — safe to gate on here.
    if (sub.metadata?.planKey !== SELLER_PREMIUM_PLAN_KEY) return;

    const status: SubscriptionStatus = deleted
      ? 'canceled'
      : mapStripeSubscriptionStatus(sub.status);

    await this.upsertSellerSubscription({
      userId,
      status,
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      stripeSubscriptionId: sub.id,
      stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
    });
  }

  private async upsertSellerSubscription(row: {
    userId: string;
    status: SubscriptionStatus;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    stripeSubscriptionId: string;
    stripeCustomerId?: string | null;
  }) {
    const existing = await this.db
      .select({ userId: sellerSubscription.userId })
      .from(sellerSubscription)
      .where(eq(sellerSubscription.userId, row.userId))
      .limit(1);
    const values = {
      userId: row.userId,
      status: row.status,
      currentPeriodEnd: row.currentPeriodEnd,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      stripeSubscriptionId: row.stripeSubscriptionId,
      stripeCustomerId: row.stripeCustomerId ?? null,
      updatedAt: new Date(),
    };
    if (existing[0]) {
      await this.db
        .update(sellerSubscription)
        .set(values)
        .where(eq(sellerSubscription.userId, row.userId));
    } else {
      await this.db.insert(sellerSubscription).values(values);
    }
  }

  private async activateFeatured(listingId: string, days: number, paymentId: string) {
    if (!listingId) {
      this.logger.warn('featured activate skipped — missing listingId');
      return;
    }
    const duration = isBoostDurationDays(days) ? days : 7;
    const endsAt = new Date(Date.now() + duration * 86_400_000);
    await this.db.insert(featuredPlacements).values({
      listingId,
      kind: 'featured',
      endsAt,
      stripePaymentId: paymentId,
    });
    await this.boosts.activateFromPayment({
      listingId,
      days: duration,
      paymentRef: paymentId,
    });
    const weight = await this.boosts.boostWeightForListing(listingId);
    await this.search.patchBoost(listingId, weight, weight > 0);
  }

  private async findOwnedPartnerDirectory(partnerDirectoryId: string, userId: string) {
    const [row] = await this.db
      .select()
      .from(partnerDirectory)
      .where(eq(partnerDirectory.id, partnerDirectoryId))
      .limit(1);
    if (!row || row.userId !== userId) {
      throw new NotFoundException('partner listing not found');
    }
    return row;
  }

  private async activatePartnerDirectory(partnerDirectoryId: string, paymentId: string) {
    if (!partnerDirectoryId) {
      this.logger.warn('partner_directory activate skipped — missing partnerDirectoryId');
      return;
    }
    const [row] = await this.db
      .select()
      .from(partnerDirectory)
      .where(eq(partnerDirectory.id, partnerDirectoryId))
      .limit(1);
    if (!row) {
      this.logger.warn(`partner_directory activate skipped — row ${partnerDirectoryId} not found`);
      return;
    }
    if (row.stripePaymentId === paymentId && row.paidPlacement) return;
    if (row.paidPlacement && row.stripePaymentId && row.stripePaymentId !== paymentId) {
      this.logger.warn(
        `partner_directory ${partnerDirectoryId} already paid via different payment`,
      );
      return;
    }
    await this.db
      .update(partnerDirectory)
      .set({
        paidPlacement: true,
        stripePaymentId: paymentId,
        updatedAt: new Date(),
      })
      .where(eq(partnerDirectory.id, partnerDirectoryId));
  }
}
