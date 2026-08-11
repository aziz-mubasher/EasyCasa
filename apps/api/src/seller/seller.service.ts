import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  buildAcceptance,
  consentDecision,
  mayProceed,
  type ConsentDecision,
} from '@easycasa/shared';
import { eq } from 'drizzle-orm';

import type { ApiConfig } from '../config';
import { APP_CONFIG } from '../config/config.module';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { consentAcceptanceLog, sellerProfile, users } from '../db/schema';
import { ConsentService } from '../privacy/consent.service';

export type SellerProfileView = {
  userId: string;
  displayName: string;
  phone: string | null;
  informativaVersionAccepted: string;
  acceptedAt: string;
  marketingConsent: boolean;
};

export type SellerConsentStatus = {
  decision: ConsentDecision;
  mayProceed: boolean;
  acceptedVersion: string | null;
  currentVersion: string;
};

@Injectable()
export class SellerService {
  private readonly logger = new Logger(SellerService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: ApiConfig,
    private readonly consent: ConsentService,
  ) {}

  async getProfile(userId: string): Promise<SellerProfileView | null> {
    const rows = await this.db
      .select()
      .from(sellerProfile)
      .where(eq(sellerProfile.userId, userId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      userId: row.userId,
      displayName: row.displayName,
      phone: row.phone,
      informativaVersionAccepted: row.informativaVersionAccepted,
      acceptedAt: row.acceptedAt.toISOString(),
      marketingConsent: row.marketingConsent,
    };
  }

  /** Current published seller informativa version (may be empty when unset). */
  informativaVersion(): string {
    return this.config.INFORMATIVA_SELLER_VERSION.trim();
  }

  /**
   * EC-S-T30 — compare accepted pointer vs current INFORMATIVA_SELLER_VERSION.
   * Logs + alerts on `invalid` (config rollback / corruption); does not throw at boot.
   */
  consentStatus(acceptedVersion: string | null | undefined): SellerConsentStatus {
    const currentVersion = this.informativaVersion();
    const decision = consentDecision(acceptedVersion, currentVersion);
    if (decision === 'invalid') {
      this.logger.error(
        `seller consent invalid: accepted=${JSON.stringify(acceptedVersion ?? null)} current=${JSON.stringify(currentVersion)}`,
      );
    }
    return {
      decision,
      mayProceed: mayProceed(decision),
      acceptedVersion: acceptedVersion ?? null,
      currentVersion,
    };
  }

  async consentStatusForUser(userId: string): Promise<SellerConsentStatus> {
    const profile = await this.getProfile(userId);
    return this.consentStatus(profile?.informativaVersionAccepted);
  }

  /**
   * Block seller feature entry when reacceptance is required or decision is invalid.
   * No profile yet → allow (onboarding / informativa routes handle first accept).
   */
  async assertFeatureEntryAllowed(userId: string): Promise<void> {
    const profile = await this.getProfile(userId);
    if (!profile) return;
    const status = this.consentStatus(profile.informativaVersionAccepted);
    if (status.mayProceed) return;
    throw new ForbiddenException({
      code: status.decision,
      message:
        status.decision === 'reacceptance_required'
          ? 'Seller informativa re-acceptance required'
          : 'Seller informativa acceptance invalid',
      consent: status,
    });
  }

  /**
   * ONLY write path for new informativa acceptances (T30).
   * Inserts append-only log row and updates seller_profile pointer when a row exists.
   */
  private async persistAcceptance(userId: string, policyVersion: string, acceptedAt: Date): Promise<{
    policyVersion: string;
    acceptedAt: Date;
  }> {
    const acceptance = buildAcceptance(policyVersion, acceptedAt);
    if (!acceptance) {
      throw new BadRequestException(
        'INFORMATIVA_SELLER_VERSION is unset or malformed — cannot accept seller informativa',
      );
    }

    await this.db.insert(consentAcceptanceLog).values({
      userId,
      policyVersion: acceptance.policyVersion,
      acceptedAt: acceptance.acceptedAt,
    });

    await this.db
      .update(sellerProfile)
      .set({
        informativaVersionAccepted: acceptance.policyVersion,
        acceptedAt: acceptance.acceptedAt,
        updatedAt: acceptance.acceptedAt,
      })
      .where(eq(sellerProfile.userId, userId));

    return acceptance;
  }

  /**
   * Complete onboarding: accept Layer 1 informativa (Art. 6(1)(b) — no service
   * consent checkbox) and optionally record unticked marketing consent.
   */
  async completeOnboarding(input: {
    userId: string;
    displayName: string;
    phone?: string | null;
    marketingConsent?: boolean;
  }): Promise<SellerProfileView> {
    const version = this.informativaVersion();
    // Refuse collection when empty/malformed — buildAcceptance is the gate.
    const preview = buildAcceptance(version);
    if (!preview) {
      this.logger.error(
        `seller informativa refuse collection: INFORMATIVA_SELLER_VERSION=${JSON.stringify(version)}`,
      );
      throw new BadRequestException(
        'INFORMATIVA_SELLER_VERSION is unset or malformed — cannot accept seller informativa',
      );
    }
    if (!input.displayName.trim()) {
      throw new BadRequestException('displayName required');
    }

    const existing = await this.getProfile(input.userId);
    if (existing) return existing;

    const now = preview.acceptedAt;
    const marketing = Boolean(input.marketingConsent);

    await this.db.insert(sellerProfile).values({
      userId: input.userId,
      displayName: input.displayName.trim(),
      phone: input.phone?.trim() || null,
      informativaVersionAccepted: preview.policyVersion,
      acceptedAt: now,
      marketingConsent: marketing,
      createdAt: now,
      updatedAt: now,
    });

    // Ledger row via the sole acceptance write helper (pointer already set on insert).
    await this.db.insert(consentAcceptanceLog).values({
      userId: input.userId,
      policyVersion: preview.policyVersion,
      acceptedAt: now,
    });

    // Mirror marketing into consent ledger when explicitly granted (default absent).
    if (marketing) {
      await this.consent.record({
        subjectId: input.userId,
        purpose: 'marketing',
        granted: true,
        policyVersion: preview.policyVersion,
      });
    }

    // Promote app role to seller when still buyer (Keycloak realm role remains source of truth for JWT).
    await this.db
      .update(users)
      .set({ role: 'seller', displayName: input.displayName.trim(), updatedAt: now })
      .where(eq(users.id, input.userId));

    const profile = await this.getProfile(input.userId);
    if (!profile) throw new NotFoundException('seller profile missing after insert');
    return profile;
  }

  /**
   * Re-accept current informativa after a major version bump (T30).
   * Uses buildAcceptance as the sole write path for the new acceptance.
   */
  async reacceptInformativa(userId: string): Promise<SellerProfileView> {
    const existing = await this.getProfile(userId);
    if (!existing) {
      throw new NotFoundException('seller profile required before re-acceptance');
    }

    const version = this.informativaVersion();
    await this.persistAcceptance(userId, version, new Date());

    const profile = await this.getProfile(userId);
    if (!profile) throw new NotFoundException('seller profile missing after re-acceptance');
    return profile;
  }
}
