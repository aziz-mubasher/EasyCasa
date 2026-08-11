import { Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { IsBooleanString, IsIn, IsOptional, IsUUID } from 'class-validator';
import type { InboxSort } from '@easycasa/shared';

import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';
import { SellerConsentGuard } from '../seller/seller-consent.guard';
import { SellerOnboardingEnabledGuard } from '../seller/seller-onboarding.guard';
import { SellerInboxEnabledGuard } from './seller-inbox.guard';
import { SellerInboxService } from './seller-inbox.service';

class InboxQueryDto {
  @IsOptional()
  @IsUUID()
  listingId?: string;

  @IsOptional()
  @IsIn(['newest', 'badge_first', 'unread_first'])
  sort?: InboxSort;

  @IsOptional()
  @IsBooleanString()
  badgedOnly?: string;

  @IsOptional()
  @IsBooleanString()
  unreadOnly?: string;
}

@Controller('seller/enquiries')
@UseGuards(SellerOnboardingEnabledGuard, SellerConsentGuard, SellerInboxEnabledGuard)
export class SellerInboxController {
  constructor(
    private readonly inbox: SellerInboxService,
    private readonly users: UsersService,
  ) {}

  @Roles('seller')
  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() q: InboxQueryDto) {
    const me = await this.users.getOrCreate(user);
    return this.inbox.list(
      me.id,
      {
        listingId: q.listingId,
        badgedOnly: q.badgedOnly === 'true',
        unreadOnly: q.unreadOnly === 'true',
      },
      q.sort ?? 'newest',
    );
  }

  @Roles('seller')
  @Patch(':id/read')
  async markRead(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    const me = await this.users.getOrCreate(user);
    return this.inbox.markRead(me.id, id);
  }
}
