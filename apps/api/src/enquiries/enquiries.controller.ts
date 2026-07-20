import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';
import { EnquiriesService } from './enquiries.service';

const INTENTS = ['info', 'viewing', 'offer'] as const;
const EVENTS = ['CONTACT', 'QUALIFY', 'CONVERT', 'CLOSE', 'REOPEN'] as const;

export class CreateEnquiryDto {
  @IsIn(INTENTS) intent!: (typeof INTENTS)[number];
  @IsString() @MinLength(1) @MaxLength(2000) message!: string;
  @IsOptional() @IsEmail() contactEmail?: string;
  @IsOptional() @IsString() @MaxLength(40) contactPhone?: string;
}

export class TransitionDto {
  @IsIn(EVENTS) event!: (typeof EVENTS)[number];
}

@Controller()
export class EnquiriesController {
  constructor(
    private readonly service: EnquiriesService,
    private readonly users: UsersService,
  ) {}

  /** Seeker submits interest on a listing. */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('listings/:listingId/enquiries')
  async create(
    @CurrentUser() user: AuthUser,
    @Param('listingId') listingId: string,
    @Body() dto: CreateEnquiryDto,
  ) {
    const me = await this.users.getOrCreate(user);
    return this.service.create(me.id, listingId, dto);
  }

  /** The seeker's own enquiries. */
  @Get('me/enquiries')
  async mine(@CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return this.service.listMine(me.id);
  }

  /** Inbound enquiries across the owner's listings. */
  @Get('me/inbound-enquiries')
  async inbound(@CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return this.service.listInbound(me.id);
  }

  @Post('enquiries/:id/transition')
  async transition(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: TransitionDto,
  ) {
    const me = await this.users.getOrCreate(user);
    return this.service.transition(me.id, id, dto.event);
  }

  @Post('enquiries/:id/convert')
  async convert(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const me = await this.users.getOrCreate(user);
    return this.service.convertToOrder(me.id, id);
  }
}
