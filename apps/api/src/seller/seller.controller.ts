import { Body, Controller, Get, NotFoundException, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { APP_CONFIG } from '../config/config.module';
import type { ApiConfig } from '../config/load';
import { Inject } from '@nestjs/common';
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
    return {
      version,
      layer1Key: `seller.informativa.${version || 'unset'}`,
      ready: Boolean(version),
    };
  }

  @Roles('buyer', 'seller', 'agent', 'partner', 'pro_marketer', 'admin')
  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return { profile: await this.seller.getProfile(me.id) };
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
    return { profile };
  }
}
