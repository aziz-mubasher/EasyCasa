import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PRODUCT_EVENTS, type AsteCreditPackSize, isAsteCreditPackSize } from '@easycasa/shared';
import { eq, sql } from 'drizzle-orm';

import { ProductAnalyticsService } from '../analytics/product-analytics.service';
import { AdminAuditService } from '../authority/admin-audit.service';
import type { ApiConfig } from '../config';
import { APP_CONFIG } from '../config/config.module';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import {
  asteAnalyses,
  asteCreditBalances,
  asteCreditLedger,
  asteReportUnlocks,
} from '../db/schema';
import { asteUserHasAnalysisAccess } from './aste-access';

export type AsteEntitlementSnapshot = {
  monetisationEnabled: boolean;
  unlocked: boolean;
  creditBalance: number;
};

@Injectable()
export class AsteCreditsService {
  private readonly log = new Logger(AsteCreditsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: ApiConfig,
    private readonly audit: AdminAuditService,
    private readonly analytics: ProductAnalyticsService,
  ) {}

  monetisationEnabled(email?: string): boolean {
    if (!this.config.PAYMENTS_ENABLED) return false;
    return asteUserHasAnalysisAccess(this.config, email);
  }

  async getBalance(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ balance: asteCreditBalances.balance })
      .from(asteCreditBalances)
      .where(eq(asteCreditBalances.userId, userId))
      .limit(1);
    return row?.balance ?? 0;
  }

  async isUnlocked(userId: string, analysisId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ userId: asteReportUnlocks.userId })
      .from(asteReportUnlocks)
      .where(
        sql`${asteReportUnlocks.userId} = ${userId} AND ${asteReportUnlocks.analysisId} = ${analysisId}`,
      )
      .limit(1);
    return Boolean(row);
  }

  async getEntitlement(userId: string, analysisId: string, email?: string): Promise<AsteEntitlementSnapshot> {
    const monetisationEnabled = this.monetisationEnabled(email);
    if (!monetisationEnabled) {
      return { monetisationEnabled: false, unlocked: true, creditBalance: 0 };
    }
    const [unlocked, creditBalance] = await Promise.all([
      this.isUnlocked(userId, analysisId),
      this.getBalance(userId),
    ]);
    return { monetisationEnabled: true, unlocked, creditBalance };
  }

  /**
   * Grant credits after verified Stripe checkout.session.completed webhook.
   * Idempotent on stripe payment id.
   */
  async grantFromStripePurchase(
    userId: string,
    credits: number,
    stripePaymentId: string,
  ): Promise<{ granted: boolean; balance: number }> {
    if (!userId || !stripePaymentId || credits <= 0) {
      this.log.warn('aste credit grant skipped — missing userId/payment/credits');
      return { granted: false, balance: 0 };
    }
    const idempotencyKey = `grant:stripe:${stripePaymentId}`;

    return this.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(asteCreditLedger)
        .values({
          userId,
          delta: credits,
          reason: 'stripe_purchase',
          stripePaymentId,
          idempotencyKey,
        })
        .onConflictDoNothing()
        .returning({ id: asteCreditLedger.id });
      if (inserted.length === 0) {
        const balance = await this.readBalanceTx(tx, userId);
        return { granted: false, balance };
      }

      await tx
        .insert(asteCreditBalances)
        .values({ userId, balance: credits })
        .onConflictDoUpdate({
          target: asteCreditBalances.userId,
          set: {
            balance: sql`${asteCreditBalances.balance} + ${credits}`,
            updatedAt: new Date(),
          },
        });

      const balance = await this.readBalanceTx(tx, userId);
      await this.audit.record({
        actorUserId: userId,
        action: 'aste.credits_granted',
        resourceType: 'aste_credit_balance',
        resourceId: userId,
        subjectUserId: userId,
        reason: `stripe:${stripePaymentId}:+${credits}`,
      });
      this.analytics.track(PRODUCT_EVENTS.ASTE_CREDITS_PURCHASED, {
        credits,
        balance,
      });
      this.log.log(
        JSON.stringify({
          event: 'aste.credits_granted',
          userId,
          credits,
          stripePaymentId,
          balance,
        }),
      );
      return { granted: true, balance };
    });
  }

  /**
   * Consume exactly one credit to unlock a full report.
   * Idempotent on (userId, analysisId) — retries/replays are free.
   */
  async unlockReport(
    userId: string,
    analysisId: string,
    email?: string,
  ): Promise<{ unlocked: boolean; creditBalance: number; alreadyUnlocked: boolean }> {
    if (!this.monetisationEnabled(email)) {
      throw new NotFoundException();
    }

    const analysis = await this.db
      .select({ id: asteAnalyses.id, userId: asteAnalyses.userId, status: asteAnalyses.status })
      .from(asteAnalyses)
      .where(eq(asteAnalyses.id, analysisId))
      .limit(1);
    const row = analysis[0];
    if (!row || row.userId !== userId) {
      throw new NotFoundException('analysis not found');
    }
    if (row.status !== 'ready') {
      throw new BadRequestException('analysis is not ready');
    }

    const idempotencyKey = `unlock:${userId}:${analysisId}`;

    return this.db.transaction(async (tx) => {
      const unlockInserted = await tx
        .insert(asteReportUnlocks)
        .values({ userId, analysisId })
        .onConflictDoNothing()
        .returning({ userId: asteReportUnlocks.userId });

      if (unlockInserted.length === 0) {
        const balance = await this.readBalanceTx(tx, userId);
        return { unlocked: true, creditBalance: balance, alreadyUnlocked: true };
      }

      await tx
        .insert(asteCreditBalances)
        .values({ userId, balance: 0 })
        .onConflictDoNothing();

      const deducted = await tx
        .update(asteCreditBalances)
        .set({ balance: sql`${asteCreditBalances.balance} - 1`, updatedAt: new Date() })
        .where(
          sql`${asteCreditBalances.userId} = ${userId} AND ${asteCreditBalances.balance} >= 1`,
        )
        .returning({ balance: asteCreditBalances.balance });

      if (deducted.length === 0) {
        throw new BadRequestException({
          code: 'ASTE_INSUFFICIENT_CREDITS',
          message: 'Insufficient credits to unlock full report',
        });
      }

      const creditBalance = deducted[0]!.balance;

      const ledgerRows = await tx
        .insert(asteCreditLedger)
        .values({
          userId,
          delta: -1,
          reason: 'report_unlock',
          analysisId,
          idempotencyKey,
        })
        .returning({ id: asteCreditLedger.id });

      await tx
        .update(asteReportUnlocks)
        .set({ creditLedgerId: ledgerRows[0]!.id })
        .where(
          sql`${asteReportUnlocks.userId} = ${userId} AND ${asteReportUnlocks.analysisId} = ${analysisId}`,
        );

      await this.audit.record({
        actorUserId: userId,
        action: 'aste.report_unlocked',
        resourceType: 'aste_analysis',
        resourceId: analysisId,
        subjectUserId: userId,
        reason: `credit_consumed:balance=${creditBalance}${
          !this.config.ASTE_ANALYSIS_ENABLED && this.config.ASTE_INTERNAL_PREVIEW
            ? ':internal_preview'
            : ''
        }`,
      });
      this.analytics.track(PRODUCT_EVENTS.ASTE_REPORT_UNLOCKED, {
        analysisId,
        creditBalance,
      });
      this.log.log(
        JSON.stringify({
          event: 'aste.report_unlocked',
          userId,
          analysisId,
          creditBalance,
        }),
      );
      return { unlocked: true, creditBalance, alreadyUnlocked: false };
    });
  }

  listPacks(): AsteCreditPackSize[] {
    return [1, 5, 20];
  }

  resolveStripePriceId(pack: AsteCreditPackSize): string {
    switch (pack) {
      case 1:
        return this.config.STRIPE_PRICE_ASTE_CREDITS_1.trim();
      case 5:
        return (this.config.STRIPE_PRICE_ASTE_CREDITS_5 ?? '').trim();
      case 20:
        return (this.config.STRIPE_PRICE_ASTE_CREDITS_20 ?? '').trim();
      default:
        return '';
    }
  }

  assertPack(pack: number): AsteCreditPackSize {
    if (!isAsteCreditPackSize(pack)) {
      throw new BadRequestException('pack must be 1, 5, or 20');
    }
    return pack;
  }

  private async readBalanceTx(tx: Db, userId: string): Promise<number> {
    const [row] = await tx
      .select({ balance: asteCreditBalances.balance })
      .from(asteCreditBalances)
      .where(eq(asteCreditBalances.userId, userId))
      .limit(1);
    return row?.balance ?? 0;
  }
}
