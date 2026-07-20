import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
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
import type { AuthUser } from '../auth/auth.types';
import { Public } from '../auth/public.decorator';
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

@Controller()
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

  @Post('listings/:listingId/availability')
  async setAvailability(
    @CurrentUser() user: AuthUser,
    @Param('listingId') listingId: string,
    @Body() dto: SetAvailabilityDto,
  ) {
    const me = await this.users.getOrCreate(user);
    await this.service.setAvailability(me.id, listingId, dto.windows);
    return { ok: true as const };
  }

  @Post('listings/:listingId/viewings')
  async book(
    @CurrentUser() user: AuthUser,
    @Param('listingId') listingId: string,
    @Body() dto: BookDto,
  ) {
    const me = await this.users.getOrCreate(user);
    return this.service.book(me.id, listingId, {
      startMs: dto.startMs,
      enquiryId: dto.enquiryId ?? null,
    });
  }

  @Get('me/viewings')
  async mine(@CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return this.service.listMine(me.id);
  }

  @Get('me/viewings/conducting')
  async conducting(@CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return this.service.listConducting(me.id);
  }

  @Post('viewings/:id/confirm')
  async confirm(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const me = await this.users.getOrCreate(user);
    return this.service.transition(me.id, id, 'CONFIRM');
  }

  @Post('viewings/:id/cancel')
  async cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const me = await this.users.getOrCreate(user);
    return this.service.transition(me.id, id, 'CANCEL');
  }

  @Post('viewings/:id/complete')
  async complete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const me = await this.users.getOrCreate(user);
    return this.service.transition(me.id, id, 'COMPLETE');
  }

  @Post('viewings/:id/no-show')
  async noShow(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const me = await this.users.getOrCreate(user);
    return this.service.transition(me.id, id, 'NO_SHOW');
  }
}
