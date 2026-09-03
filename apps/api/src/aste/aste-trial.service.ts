import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ABUSE_COUNTER_RETENTION_DAYS,
  ABUSE_SALT_ROTATION_DAYS,
  decideTrial,
  tryCanonicalEmail,
  trialLogPayload,
  type TrialDecision,
  type TrialSignalCode,
} from '@easycasa/shared';
import { and, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { asteAbuseCounters, asteAbuseSalts, asteTrialGrants } from '../db/schema';
import { AsteCreditsService } from './aste-credits.service';
import {
  abuseIpSalt,
  hashRequestIp,
  isAuthEmailVerified,
  trialEnforcementEnabled,
  trialRequireVerifiedEmail,
} from './aste-trial-request';

export type TrialGrantInput = {
  userId: string;
  email?: string | null;
  emailVerified?: boolean;
  /** Already-hashed bucket. Prefer this over passing a raw IP. */
  bucketHash?: string | null;
};

@Injectable()
export class AsteTrialService {
  private readonly log = new Logger(AsteTrialService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly credits: AsteCreditsService,
  ) {}

  /**
   * Phase 0: always ALLOW after the verified-email gate.
   * IP is counted only. Score is stored; it does not withhold the credit
   * until ASTE_TRIAL_ENFORCEMENT is on.
   */
  async ensureFirstFileFree(input: TrialGrantInput): Promise<{
    granted: boolean;
    balance: number;
    decision: TrialDecision;
  }> {
    const emailVerified = input.emailVerified === true;
    const requireVerified = trialRequireVerifiedEmail();
    const enforcement = trialEnforcementEnabled();
    const emailCanonical = tryCanonicalEmail(input.email);
    const bucketCount = input.bucketHash
      ? await this.incrementBucket(input.bucketHash)
      : 0;
    const signals = this.phase0Signals(bucketCount);
    const verdict = decideTrial({
      emailVerified: requireVerified ? emailVerified : true,
      enforcement,
      signals,
    });

    if (!verdict.grantCredit) {
      await this.upsertGrantRow({
        userId: input.userId,
        emailCanonical,
        decision: verdict.decision,
        score: verdict.score,
        reasons: requireVerified && !emailVerified ? [] : verdict.reasons,
        grantedAt: null,
        creditId: null,
        emailVerifiedAt: emailVerified ? new Date() : null,
      });
      this.safeLog({
        event: 'aste.trial_withheld',
        userId: input.userId,
        decision: verdict.decision,
        score: verdict.score,
        reasons: verdict.reasons,
        granted: false,
        bucketHash: input.bucketHash,
      });
      return {
        granted: false,
        balance: await this.credits.getBalance(input.userId),
        decision: verdict.decision,
      };
    }

    const taken = await this.grantedCanonicalOwner(emailCanonical);
    if (taken && taken !== input.userId) {
      await this.upsertGrantRow({
        userId: input.userId,
        emailCanonical,
        decision: verdict.decision,
        score: verdict.score,
        reasons: verdict.reasons,
        grantedAt: null,
        creditId: null,
        emailVerifiedAt: emailVerified ? new Date() : null,
      });
      this.safeLog({
        event: 'aste.trial_canonical_taken',
        userId: input.userId,
        decision: verdict.decision,
        score: verdict.score,
        reasons: verdict.reasons,
        granted: false,
        bucketHash: input.bucketHash,
      });
      return {
        granted: false,
        balance: await this.credits.getBalance(input.userId),
        decision: verdict.decision,
      };
    }

    const { granted, balance, creditId } = await this.credits.grantFirstFileFree(input.userId);
    await this.upsertGrantRow({
      userId: input.userId,
      emailCanonical,
      decision: verdict.decision,
      score: verdict.score,
      reasons: verdict.reasons,
      grantedAt: granted ? new Date() : undefined,
      creditId: creditId ?? undefined,
      emailVerifiedAt: emailVerified ? new Date() : null,
    });
    this.safeLog({
      event: granted ? 'aste.trial_granted' : 'aste.trial_idempotent',
      userId: input.userId,
      decision: verdict.decision,
      score: verdict.score,
      reasons: verdict.reasons,
      granted,
      bucketHash: input.bucketHash,
    });
    return { granted, balance, decision: verdict.decision };
  }

  async rotateSaltIfDue(now = new Date()): Promise<{ rotated: boolean; keyId: string | null }> {
    const salt = abuseIpSalt();
    if (!salt) return { rotated: false, keyId: null };

    const [current] = await this.db
      .select({
        id: asteAbuseSalts.id,
        keyId: asteAbuseSalts.keyId,
        createdAt: asteAbuseSalts.createdAt,
      })
      .from(asteAbuseSalts)
      .where(sql`${asteAbuseSalts.retiredAt} IS NULL`)
      .limit(1);

    const ageMs = current ? now.getTime() - new Date(current.createdAt).getTime() : Number.POSITIVE_INFINITY;
    const due = !current || ageMs >= ABUSE_SALT_ROTATION_DAYS * 24 * 60 * 60 * 1000;
    if (!due) return { rotated: false, keyId: current.keyId };

    const keyId = `abuse-ip-${now.toISOString().slice(0, 10)}-${randomUUID().slice(0, 8)}`;
    await this.db.transaction(async (tx) => {
      if (current) {
        await tx
          .update(asteAbuseSalts)
          .set({ retiredAt: now })
          .where(eq(asteAbuseSalts.id, current.id));
      }
      await tx.insert(asteAbuseSalts).values({ keyId, createdAt: now });
    });
    return { rotated: true, keyId };
  }

  async dropExpiredCounters(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - ABUSE_COUNTER_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const deleted = await this.db
      .delete(asteAbuseCounters)
      .where(sql`${asteAbuseCounters.lastSeenAt} < ${cutoff}`)
      .returning({ bucketHash: asteAbuseCounters.bucketHash });
    return deleted.length;
  }

  private async grantedCanonicalOwner(emailCanonical: string | null): Promise<string | null> {
    if (!emailCanonical) return null;
    const [row] = await this.db
      .select({ userId: asteTrialGrants.userId })
      .from(asteTrialGrants)
      .where(
        and(
          eq(asteTrialGrants.emailCanonical, emailCanonical),
          sql`${asteTrialGrants.grantedAt} IS NOT NULL`,
        ),
      )
      .limit(1);
    return row?.userId ?? null;
  }

  private phase0Signals(bucketCount: number): TrialSignalCode[] {
    if (bucketCount >= 4) return ['IP_BUCKET_4TH_PLUS'];
    if (bucketCount === 3) return ['IP_BUCKET_3RD'];
    if (bucketCount === 2) return ['IP_BUCKET_2ND'];
    return [];
  }

  private async incrementBucket(bucketHash: string): Promise<number> {
    const now = new Date();
    const [row] = await this.db
      .insert(asteAbuseCounters)
      .values({
        bucketHash,
        windowStart: now,
        count: 1,
        lastSeenAt: now,
      })
      .onConflictDoUpdate({
        target: asteAbuseCounters.bucketHash,
        set: {
          count: sql`${asteAbuseCounters.count} + 1`,
          lastSeenAt: now,
        },
      })
      .returning({ count: asteAbuseCounters.count });
    return row?.count ?? 1;
  }

  private async upsertGrantRow(input: {
    userId: string;
    emailCanonical: string | null;
    decision: TrialDecision;
    score: number;
    reasons: readonly string[];
    grantedAt?: Date | null;
    creditId?: string | null;
    emailVerifiedAt: Date | null;
  }): Promise<void> {
    const grantedAt = input.grantedAt === undefined ? undefined : input.grantedAt;
    await this.db
      .insert(asteTrialGrants)
      .values({
        userId: input.userId,
        emailCanonical: input.emailCanonical,
        decision: input.decision,
        score: input.score,
        reasons: [...input.reasons],
        grantedAt: grantedAt ?? null,
        creditId: input.creditId ?? null,
        emailVerifiedAt: input.emailVerifiedAt,
      })
      .onConflictDoUpdate({
        target: asteTrialGrants.userId,
        set: {
          emailCanonical: input.emailCanonical,
          decision: input.decision,
          score: input.score,
          reasons: [...input.reasons],
          ...(grantedAt !== undefined ? { grantedAt } : {}),
          ...(input.creditId !== undefined ? { creditId: input.creditId } : {}),
          emailVerifiedAt: input.emailVerifiedAt,
        },
      });
  }

  private safeLog(input: Parameters<typeof trialLogPayload>[0]): void {
    const payload = trialLogPayload(input);
    this.log.log(JSON.stringify(payload));
  }
}

export { hashRequestIp, isAuthEmailVerified };
