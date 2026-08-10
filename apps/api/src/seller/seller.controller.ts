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
