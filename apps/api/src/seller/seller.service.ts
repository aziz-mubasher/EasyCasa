import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';

import type { ApiConfig } from '../config';
import { APP_CONFIG } from '../config/config.module';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { sellerProfile, users } from '../db/schema';
import { ConsentService } from '../privacy/consent.service';

export type SellerProfileView = {
  userId: string;
  displayName: string;
  phone: string | null;
  informativaVersionAccepted: string;
  acceptedAt: string;
  marketingConsent: boolean;
};

@Injectable()
export class SellerService {
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
    const version = this.config.INFORMATIVA_SELLER_VERSION.trim();
    if (!version) {
      throw new BadRequestException(
        'INFORMATIVA_SELLER_VERSION is unset — cannot accept seller informativa',
      );
    }
    if (!input.displayName.trim()) {
      throw new BadRequestException('displayName required');
    }

    const existing = await this.getProfile(input.userId);
    if (existing) return existing;

    const now = new Date();
    const marketing = Boolean(input.marketingConsent);

    await this.db.insert(sellerProfile).values({
      userId: input.userId,
      displayName: input.displayName.trim(),
      phone: input.phone?.trim() || null,
      informativaVersionAccepted: version,
      acceptedAt: now,
      marketingConsent: marketing,
      createdAt: now,
      updatedAt: now,
    });

    // Mirror marketing into consent ledger when explicitly granted (default absent).
    if (marketing) {
      await this.consent.record({
        subjectId: input.userId,
        purpose: 'marketing',
        granted: true,
        policyVersion: version,
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

  informativaVersion(): string {
    return this.config.INFORMATIVA_SELLER_VERSION.trim();
  }
}
