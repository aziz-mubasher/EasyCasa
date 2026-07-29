import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

import { CurrentUser } from '../auth/current-user.decorator';
import {
  RequiresAuth,
  RequiresCapability,
} from '../auth/capability.decorator';
import { RequiresRelationship } from '../auth/relationship.decorator';
import { SerializeFor } from '../auth/serialize-for.decorator';
import type { AuthUser } from '../auth/auth.types';
import { Public } from '../auth/public.decorator';
import {
  viewingForConductor,
  viewingForSeeker,
} from '../authority/serializers/viewing.serializer';
import { UsersService } from '../users/users.service';
import { ViewingsService } from './viewings.service';

export class WindowDto {
  @IsInt() @Min(0) @Max(6) weekday!: number;
  @IsInt() @Min(0) @Max(1440) startMinutes!: number;
  @IsInt() @Min(0) @Max(1440) endMinutes!: number;
}

export class SetAvailabilityDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => WindowDto)
  windows!: WindowDto[];
}

export class BookDto {
  @Type(() => Number)
  @IsInt()
  startMs!: number;
  @IsOptional() @IsString() enquiryId?: string;
}

export class RescheduleDto {
  @Type(() => Number)
  @IsInt()
  startMs!: number;
}

@Controller()
@RequiresAuth()
export class ViewingsController {
  constructor(
    private readonly service: ViewingsService,
    private readonly users: UsersService,
  ) {}

  /** Public: bookable slots for a listing over [from, to] (epoch ms). */
  @Public()
  @Get('listings/:listingId/slots')
  slots(
    @Param('listingId') listingId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.service.slots(listingId, Number(from), Number(to));
  }

  /** Conductor: read current weekly windows (needed for post-publish edit). */
  @RequiresCapability('conductor')
  @RequiresRelationship('listing.owner')
  @Get('listings/:listingId/availability')
  async getAvailability(
    @CurrentUser() user: AuthUser,
    @Param('listingId') listingId: string,
  ) {
    const me = await this.users.getOrCreate(user);
    const windows = await this.service.getAvailability(me.id, listingId);
    return { windows };
  }

  @RequiresCapability('conductor')
  @RequiresRelationship('listing.owner')
  @Post('listings/:listingId/availability')
  async setAvailability(
    @CurrentUser() user: AuthUser,
    @Param('listingId') listingId: string,
    @Body() dto: SetAvailabilityDto,
    @Query('source') source?: string,
  ) {
    const me = await this.users.getOrCreate(user);
    const src = source === 'edit' ? 'edit' : 'publish';
    await this.service.setAvailability(me.id, listingId, dto.windows, src);
    return { ok: true as const };
  }

  @RequiresCapability('seeker')
  @Post('listings/:listingId/viewings')
  async book(
    @CurrentUser() user: AuthUser,
    @Param('listingId') listingId: string,
    @Body() dto: BookDto,
  ) {
    const me = await this.users.getOrCreate(user);
    const raw = await this.service.book(me.id, listingId, {
      startMs: dto.startMs,
      enquiryId: dto.enquiryId ?? null,
    });
    return viewingForSeeker(raw);
  }

  @RequiresCapability('seeker')
  @SerializeFor('seeker')
  @Get('me/viewings')
  async mine(@CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    const rows = await this.service.listMine(me.id);
    return rows.map(viewingForSeeker);
  }

  @RequiresCapability('conductor')
  @SerializeFor('conductor')
  @Get('me/viewings/conducting')
  async conducting(@CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    const rows = await this.service.listConducting(me.id);
    return rows.map(viewingForConductor);
  }

  @RequiresCapability('conductor')
  @RequiresRelationship('viewing.conductor')
  @SerializeFor('conductor')
  @Post('viewings/:id/confirm')
  async confirm(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const me = await this.users.getOrCreate(user);
    const raw = await this.service.transition(me.id, id, 'CONFIRM');
    return viewingForConductor(raw);
  }

  @RequiresCapability('seeker')
  @RequiresRelationship('viewing.participant')
  @Post('viewings/:id/cancel')
  async cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const me = await this.users.getOrCreate(user);
    const raw = await this.service.transition(me.id, id, 'CANCEL');
    if (raw.conductorUserId === me.id) return viewingForConductor(raw);
    return viewingForSeeker(raw);
  }

  @RequiresCapability('conductor')
  @RequiresRelationship('viewing.conductor')
  @SerializeFor('conductor')
  @Post('viewings/:id/complete')
  async complete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const me = await this.users.getOrCreate(user);
    const raw = await this.service.transition(me.id, id, 'COMPLETE');
    return viewingForConductor(raw);
  }

  @RequiresCapability('conductor')
  @RequiresRelationship('viewing.conductor')
  @SerializeFor('conductor')
  @Post('viewings/:id/no-show')
  async noShow(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const me = await this.users.getOrCreate(user);
    const raw = await this.service.transition(me.id, id, 'NO_SHOW');
    return viewingForConductor(raw);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @RequiresCapability('seeker')
  @RequiresRelationship('viewing.participant')
  @Post('viewings/:id/reschedule')
  async reschedule(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RescheduleDto,
  ) {
    const me = await this.users.getOrCreate(user);
    const raw = await this.service.reschedule(me.id, id, dto.startMs);
    if (raw.conductorUserId === me.id) return viewingForConductor(raw);
    return viewingForSeeker(raw);
  }
}
