import { Controller, Param, Post, UseGuards } from '@nestjs/common';

import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';
import { SellerOnboardingEnabledGuard } from '../seller/seller-onboarding.guard';
import { ListingsService } from './listings.service';

/**
 * EC-S-T13 — seller publish/unpublish behind onboarding flag (404 when off).
 * Existing POST /listings/:id/publish remains for agents; both call the same service.
 */
@Controller('seller/listings')
@UseGuards(SellerOnboardingEnabledGuard)
export class SellerListingsController {
  constructor(
    private readonly listings: ListingsService,
    private readonly users: UsersService,
  ) {}

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
