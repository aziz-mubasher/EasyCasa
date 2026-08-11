import { Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';

import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';
import { SellerConsentGuard } from '../seller/seller-consent.guard';
import { SellerOnboardingEnabledGuard } from '../seller/seller-onboarding.guard';
import { SellerNudgesEnabledGuard } from './seller-nudges.guard';
import { SellerNudgesService } from './seller-nudges.service';

@Controller('seller/listings/:listingId/nudges')
@UseGuards(SellerOnboardingEnabledGuard, SellerConsentGuard, SellerNudgesEnabledGuard)
export class SellerNudgesController {
  constructor(
    private readonly nudges: SellerNudgesService,
    private readonly users: UsersService,
  ) {}

  @Roles('seller', 'agent', 'partner', 'pro_marketer', 'admin')
  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Param('listingId', ParseUUIDPipe) listingId: string,
  ) {
    const me = await this.users.getOrCreate(user);
    return this.nudges.listActive(me.id, listingId);
  }

  @Roles('seller', 'agent', 'partner', 'pro_marketer', 'admin')
  @Patch(':code/dismiss')
  async dismiss(
    @CurrentUser() user: AuthUser,
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @Param('code') code: string,
  ) {
    const me = await this.users.getOrCreate(user);
    return this.nudges.dismiss(me.id, listingId, code);
  }
}
