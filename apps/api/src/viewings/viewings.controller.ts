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
  @IsInt() startMs!: number;
  @IsOptional() @IsString() enquiryId?: string;
}

@Controller()
export class ViewingsController {
  constructor(private readonly service: ViewingsService) {}

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
    await this.service.setAvailability(user.sub, listingId, dto.windows);
    return { ok: true as const };
  }

  @Post('listings/:listingId/viewings')
  book(
    @CurrentUser() user: AuthUser,
    @Param('listingId') listingId: string,
    @Body() dto: BookDto,
  ) {
    return this.service.book(user.sub, listingId, {
      startMs: dto.startMs,
      enquiryId: dto.enquiryId ?? null,
    });
  }

  @Get('me/viewings')
  mine(@CurrentUser() user: AuthUser) {
    return this.service.listMine(user.sub);
  }

  @Get('me/viewings/conducting')
  conducting(@CurrentUser() user: AuthUser) {
    return this.service.listConducting(user.sub);
  }

  @Post('viewings/:id/confirm')
  confirm(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.transition(user.sub, id, 'CONFIRM');
  }

  @Post('viewings/:id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.transition(user.sub, id, 'CANCEL');
  }

  @Post('viewings/:id/complete')
  complete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.transition(user.sub, id, 'COMPLETE');
  }

  @Post('viewings/:id/no-show')
  noShow(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.transition(user.sub, id, 'NO_SHOW');
  }
}
