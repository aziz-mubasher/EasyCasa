import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { SellerOnboardingEnabledGuard } from '../seller/seller-onboarding.guard';
import { SellerService } from '../seller/seller.service';
import { UsersService } from '../users/users.service';
import { SellerAnalyticsEnabledGuard } from './seller-analytics.guard';
import { SellerAnalyticsService } from './seller-analytics.service';

/**
 * EC-S-T23 — seller listing analytics behind onboarding + analytics flags (404 when off).
 */
@Controller('seller/listings')
@UseGuards(SellerOnboardingEnabledGuard, SellerAnalyticsEnabledGuard)
@Roles('seller')
export class SellerAnalyticsController {
  constructor(
    private readonly analytics: SellerAnalyticsService,
    private readonly users: UsersService,
    private readonly sellers: SellerService,
  ) {}

  @Get(':id/analytics')
  async get(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('window') window?: string,
  ) {
    const me = await this.users.getOrCreate(user);
    const profile = await this.sellers.getProfile(me.id);
    if (!profile) throw new ForbiddenException('seller profile required');
    return this.analytics.getAnalytics(me.id, id, window);
  }
}
