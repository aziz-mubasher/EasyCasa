import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';
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
