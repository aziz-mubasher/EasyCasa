import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { APP_CONFIG } from '../config/config.module';
import type { ApiConfig } from '../config/load';
import { UsersService } from '../users/users.service';
import { SellerQuotaService } from '../seller-quota/seller-quota.service';
import { SellerOnboardingEnabledGuard } from './seller-onboarding.guard';
import { SellerService } from './seller.service';

class CompleteOnboardingDto {
  @IsString()
  @MinLength(1)
  displayName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  /** Unticked by default — Art. 6(1)(a) marketing only when explicitly true. */
  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean;
}

@Controller('seller')
@UseGuards(SellerOnboardingEnabledGuard)
export class SellerController {
  constructor(
    private readonly seller: SellerService,
    private readonly users: UsersService,
    private readonly quota: SellerQuotaService,
    @Inject(APP_CONFIG) private readonly config: ApiConfig,
  ) {}

  @Roles('buyer', 'seller', 'agent', 'partner', 'pro_marketer', 'admin')
  @Get('informativa')
  informativa() {
    const version = this.seller.informativaVersion();
    const currentDecision = this.seller.consentStatus(version);
    // Same version vs itself → ok when parseable; invalid when env is empty/malformed.
    return {
      version,
      layer1Key: `seller.informativa.${version || 'unset'}`,
      ready: currentDecision.decision === 'ok',
      consentDecision: currentDecision.decision,
    };
  }

  @Roles('buyer', 'seller', 'agent', 'partner', 'pro_marketer', 'admin')
  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    const profile = await this.seller.getProfile(me.id);
    const consent = this.seller.consentStatus(profile?.informativaVersionAccepted);
    return {
      profile,
      /** T30 — ok|notice (banner) or reacceptance_required|invalid (block). */
      consent,
    };
  }

  /** EC-S-T27 — effective tier + entitlements (local seller_subscription only). */
  @Roles('seller', 'agent', 'partner', 'pro_marketer', 'admin')
  @Get('entitlements')
  async entitlements(@CurrentUser() user: AuthUser) {
    if (!this.config.SELLER_PREMIUM_ENABLED) {
      throw new NotFoundException('seller premium not available');
    }
    const me = await this.users.getOrCreate(user);
    const resolved = await this.quota.resolveEntitlements(me.id);
    return {
      tier: resolved.tier,
      entitlements: resolved.entitlements,
      quota: resolved.quota,
      source: 'seller_subscription' as const,
    };
  }

  @Roles('buyer', 'seller', 'agent', 'partner', 'pro_marketer', 'admin')
  @Post('onboarding')
  async onboard(@CurrentUser() user: AuthUser, @Body() body: CompleteOnboardingDto) {
    const me = await this.users.getOrCreate(user);
    const profile = await this.seller.completeOnboarding({
      userId: me.id,
      displayName: body.displayName,
      phone: body.phone,
      marketingConsent: body.marketingConsent === true,
    });
    return {
      profile,
      consent: this.seller.consentStatus(profile.informativaVersionAccepted),
    };
  }

  /** T30 — re-accept current informativa after a major version bump. */
  @Roles('buyer', 'seller', 'agent', 'partner', 'pro_marketer', 'admin')
  @Post('informativa/accept')
  async acceptInformativa(@CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    const profile = await this.seller.reacceptInformativa(me.id);
    return {
      profile,
      consent: this.seller.consentStatus(profile.informativaVersionAccepted),
    };
  }
}
