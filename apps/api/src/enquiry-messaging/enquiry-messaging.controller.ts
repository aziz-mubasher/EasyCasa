import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { Throttle } from '@nestjs/throttler';

import { RequiresAuth } from '../auth/capability.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';
import { EnquiryMessagingService } from './enquiry-messaging.service';
import { SellerMessagingEnabledGuard } from './seller-messaging.guard';

class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body!: string;
}

/**
 * EC-S-T25 — enquiry thread messages for private-seller track.
 * Both seeker and owner may list/send. Flag-off → 404.
 */
@Controller('enquiries')
@RequiresAuth()
@UseGuards(SellerMessagingEnabledGuard)
export class EnquiryMessagingController {
  constructor(
    private readonly messaging: EnquiryMessagingService,
    private readonly users: UsersService,
  ) {}

  @Get(':id/messages')
  async list(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    const me = await this.users.getOrCreate(user);
    return this.messaging.list(id, me.id);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post(':id/messages')
  async send(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ) {
    const me = await this.users.getOrCreate(user);
    return this.messaging.send(id, me.id, dto.body);
  }
}
