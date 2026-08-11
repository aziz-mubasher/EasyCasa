import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import {
  viewingForConductor,
  viewingForSeeker,
} from '../authority/serializers/viewing.serializer';
import { SellerOnboardingEnabledGuard } from '../seller/seller-onboarding.guard';
import { SellerService } from '../seller/seller.service';
import { UsersService } from '../users/users.service';
import { SellerViewingsEnabledGuard } from './seller-viewings.guard';
import { RescheduleDto, SetAvailabilityDto } from './viewings.controller';
import { ViewingsService } from './viewings.service';

/**
 * EC-S-T21/T22 — seller-facing viewing routes behind onboarding + viewings flags.
 * Existing public/agent `/listings/...` and `/viewings/...` routes stay unchanged.
 * AuthZ: seller role + seller_profile + listing ownership (availability) /
 * ownership of the viewing's listing (lifecycle).
 */
@Controller('seller')
@UseGuards(SellerOnboardingEnabledGuard, SellerViewingsEnabledGuard)
@Roles('seller')
export class SellerViewingsController {
  constructor(
    private readonly service: ViewingsService,
    private readonly users: UsersService,
    private readonly sellers: SellerService,
  ) {}

  private async requireSellerUser(user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    const profile = await this.sellers.getProfile(me.id);
    if (!profile) throw new ForbiddenException('seller profile required');
    return me;
  }

  @Get('listings/:listingId/availability')
  async getAvailability(
    @CurrentUser() user: AuthUser,
    @Param('listingId') listingId: string,
  ) {
    const me = await this.requireSellerUser(user);
    await this.service.assertSellerOwner(me.id, listingId);
    const windows = await this.service.getAvailability(me.id, listingId);
    return { windows };
  }

  @Post('listings/:listingId/availability')
  async setAvailability(
    @CurrentUser() user: AuthUser,
    @Param('listingId') listingId: string,
    @Body() dto: SetAvailabilityDto,
    @Query('source') source?: string,
  ) {
    const me = await this.requireSellerUser(user);
    await this.service.assertSellerOwner(me.id, listingId);
    const src = source === 'edit' ? 'edit' : 'publish';
    await this.service.setAvailability(me.id, listingId, dto.windows, src);
    return { ok: true as const };
  }

  @Get('viewings/conducting')
  async conducting(@CurrentUser() user: AuthUser) {
    const me = await this.requireSellerUser(user);
    const rows = await this.service.listConducting(me.id);
    return rows.map(viewingForConductor);
  }

  @Post('viewings/:id/confirm')
  async confirm(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const me = await this.requireSellerUser(user);
    await this.service.assertSellerOwnsViewing(me.id, id);
    const raw = await this.service.transition(me.id, id, 'CONFIRM');
    return viewingForConductor(raw);
  }

  @Post('viewings/:id/cancel')
  async cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const me = await this.requireSellerUser(user);
    await this.service.assertSellerOwnsViewing(me.id, id);
    const raw = await this.service.transition(me.id, id, 'CANCEL');
    if (raw.conductorUserId === me.id) return viewingForConductor(raw);
    return viewingForSeeker(raw);
  }

  @Post('viewings/:id/complete')
  async complete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const me = await this.requireSellerUser(user);
    await this.service.assertSellerOwnsViewing(me.id, id);
    const raw = await this.service.transition(me.id, id, 'COMPLETE');
    return viewingForConductor(raw);
  }

  @Post('viewings/:id/no-show')
  async noShow(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const me = await this.requireSellerUser(user);
    await this.service.assertSellerOwnsViewing(me.id, id);
    const raw = await this.service.transition(me.id, id, 'NO_SHOW');
    return viewingForConductor(raw);
  }

  @Post('viewings/:id/reschedule')
  async reschedule(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RescheduleDto,
  ) {
    const me = await this.requireSellerUser(user);
    await this.service.assertSellerOwnsViewing(me.id, id);
    const raw = await this.service.reschedule(me.id, id, dto.startMs);
    if (raw.conductorUserId === me.id) return viewingForConductor(raw);
    return viewingForSeeker(raw);
  }
}
