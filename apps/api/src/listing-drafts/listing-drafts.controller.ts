import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsIn } from 'class-validator';

import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';
import { SellerConsentGuard } from '../seller/seller-consent.guard';
import { SellerOnboardingEnabledGuard } from '../seller/seller-onboarding.guard';
import { SellerQuotaService } from '../seller-quota/seller-quota.service';
import { ListingDraftsService } from './listing-drafts.service';

class NavigateDto {
  @IsIn(['next', 'prev'])
  direction!: 'next' | 'prev';
}

/**
 * EC-S-T07 + PR-W — private-seller drafts behind onboarding flag.
 * Submit materializes listing + publish (first_published_at sticky).
 */
@Controller('listing-drafts')
@UseGuards(SellerOnboardingEnabledGuard, SellerConsentGuard)
export class ListingDraftsController {
  constructor(
    private readonly drafts: ListingDraftsService,
    private readonly users: UsersService,
    private readonly quota: SellerQuotaService,
  ) {}

  @Roles('seller')
  @Post()
  async create(@CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return this.drafts.create(me.id);
  }

  @Roles('seller')
  @Get(':id')
  async get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const me = await this.users.getOrCreate(user);
    const row = await this.drafts.get(me.id, id);
    return { id: row.id, status: row.status, draft: row.payload, updatedAt: row.updatedAt };
  }

  @Roles('seller')
  @Patch(':id')
  async patch(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const me = await this.users.getOrCreate(user);
    const raw = body.payload ?? body;
    return this.drafts.patch(me.id, id, raw);
  }

  @Roles('seller')
  @Post(':id/navigate')
  async navigate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: NavigateDto,
  ) {
    const me = await this.users.getOrCreate(user);
    return this.drafts.navigate(me.id, id, body.direction);
  }

  @Roles('seller')
  @Post(':id/submit')
  async submit(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const me = await this.users.getOrCreate(user);
    await this.quota.assertListingCreateAllowed(me.id, user, acceptLanguage);
    return this.drafts.submit(me.id, id, user);
  }
}
