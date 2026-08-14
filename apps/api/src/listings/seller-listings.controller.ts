import { Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import {
  SELLER_CHECKLIST_TYPE_CODES,
  badgeActive,
  type VoState,
} from '@easycasa/shared';

import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { APP_CONFIG } from '../config/config.module';
import type { ApiConfig } from '../config/load';
import { UsersService } from '../users/users.service';
import { SellerConsentGuard } from '../seller/seller-consent.guard';
import { SellerOnboardingEnabledGuard } from '../seller/seller-onboarding.guard';
import { ListingBoostService } from '../listing-boost/listing-boost.service';
import { ListingsService } from './listings.service';
import { ListingsRepository } from './listings.repository';

/**
 * EC-S-T13 — seller publish/unpublish behind onboarding flag (404 when off).
 * PP-5 — GET index for dashboard listing cards + boost state.
 */
@Controller('seller/listings')
@UseGuards(SellerOnboardingEnabledGuard, SellerConsentGuard)
export class SellerListingsController {
  constructor(
    private readonly listings: ListingsService,
    private readonly repo: ListingsRepository,
    private readonly boosts: ListingBoostService,
    private readonly users: UsersService,
    @Inject(APP_CONFIG) private readonly config: ApiConfig,
  ) {}

  /** PP-5 — seller dashboard listing cards (boost label + purchase gating metadata). */
  @Roles('buyer', 'seller', 'agent', 'partner', 'pro_marketer', 'admin')
  @Get()
  async listMine(@CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    const rows = await this.repo.listForOwner(me.id);
    const boostEnabled = this.config.LISTING_BOOST_ENABLED;
    const voEnabled = this.config.VERIFIED_OWNER_ENABLED;
    const checklistEnabled = this.config.SELLER_CHECKLIST_ENABLED;
    const checklistTotal = SELLER_CHECKLIST_TYPE_CODES.length;
    const now = new Date();
    const items = await Promise.all(
      rows.map(async (row) => {
        const boostRow = boostEnabled
          ? await this.boosts.activeBoostForListing(row.id, now)
          : null;
        const completeness =
          row.docCompleteness == null ? null : Number(row.docCompleteness);
        const docHave =
          completeness == null
            ? null
            : Math.round((completeness / 100) * checklistTotal);
        const voState = (row.voState as VoState | null) ?? null;
        return {
          id: row.id,
          slug: row.slug,
          title: row.title,
          status: row.status,
          city: row.city,
          price: row.price,
          currency: row.currency,
          coverUrl: row.coverUrl,
          trust: {
            verifiedOwner: voState ? badgeActive(voState) : false,
            voState,
            docScore:
              docHave != null && completeness != null
                ? { have: docHave, total: checklistTotal }
                : null,
          },
          boost: boostRow
            ? {
                active: true,
                endsAt: boostRow.endsAt.toISOString(),
                remainingDays: Math.max(
                  1,
                  Math.ceil(boostRow.remainingMs / 86_400_000),
                ),
              }
            : boostEnabled
              ? { active: false, endsAt: null, remainingDays: null }
              : null,
        };
      }),
    );
    return {
      flags: {
        listingBoostEnabled: boostEnabled,
        sellerPremiumEnabled: this.config.SELLER_PREMIUM_ENABLED,
        verifiedOwnerEnabled: voEnabled,
        sellerChecklistEnabled: checklistEnabled,
      },
      items,
    };
  }

  @Roles('seller')
  @Post(':id/publish')
  async publish(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return this.listings.publish(id, user, me.id);
  }

  @Roles('seller')
  @Post(':id/unpublish')
  async unpublish(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return this.listings.unpublish(id, user, me.id);
  }
}
