import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Inject,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { IsIn, IsUUID } from 'class-validator';
import { isBoostDurationDays, type BoostDurationDays } from '@easycasa/shared';

import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { APP_CONFIG } from '../config/config.module';
import type { ApiConfig } from '../config/load';
import { StripeService } from '../billing/stripe.service';
import { UsersService } from '../users/users.service';
import { ListingsRepository } from '../listings/listings.repository';
import { ListingBoostService } from '../listing-boost/listing-boost.service';

class BoostCheckoutDto {
  @IsUUID() listingId!: string;
  @IsIn([7, 30]) days!: BoostDurationDays;
}

@Controller('featured')
@Roles('buyer', 'seller', 'agent', 'partner', 'pro_marketer', 'admin')
export class FeaturedController {
  constructor(
    private readonly stripe: StripeService,
    private readonly users: UsersService,
    private readonly listings: ListingsRepository,
    private readonly boosts: ListingBoostService,
    @Inject(APP_CONFIG) private readonly config: ApiConfig,
  ) {}

  @Post('checkout')
  async checkout(@CurrentUser() user: AuthUser, @Body() dto: BoostCheckoutDto) {
    if (!this.config.LISTING_BOOST_ENABLED) {
      throw new NotFoundException('listing boost not available');
    }
    if (!isBoostDurationDays(dto.days)) {
      throw new BadRequestException('days must be 7 or 30');
    }
    const me = await this.users.getOrCreate(user);
    const listing = await this.listings.findById(dto.listingId);
    if (!listing) throw new NotFoundException('listing not found');
    const owner = listing.ownerUserId ?? listing.agentId;
    if (owner !== me.id && !user.roles.includes('admin')) {
      throw new NotFoundException('listing not found');
    }
    if (listing.status !== 'published') {
      throw new BadRequestException('listing must be published');
    }
    if (await this.boosts.isListingBoosted(dto.listingId)) {
      throw new ConflictException('listing already has an active boost');
    }
    return { url: await this.stripe.createFeaturedCheckout(dto.listingId, dto.days) };
  }
}
