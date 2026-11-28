import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';

import { RequiresCapability } from '../auth/capability.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';
import { WhatsAppLiveInboxService } from './whatsapp-live-inbox.service';

class FollowUpBody {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  staffName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subject!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(8)
  locale!: string;
}

@Controller('admin/whatsapp/live')
@RequiresCapability('whatsapp:inbound:read')
export class WhatsAppLiveInboxController {
  constructor(
    private readonly live: WhatsAppLiveInboxService,
    private readonly users: UsersService,
  ) {}

  @Get('status')
  status() {
    return this.live.status();
  }

  @Get()
  list() {
    return this.live.list();
  }

  @Get(':conversationId')
  async detail(@Param('conversationId') conversationId: string, @CurrentUser() user: AuthUser) {
    const actor = await this.users.getOrCreate(user);
    return this.live.detail(conversationId, actor.id);
  }

  @Post(':conversationId/follow-up')
  @RequiresCapability('whatsapp:inbound:reply')
  async followUp(
    @Param('conversationId') conversationId: string,
    @Body() body: FollowUpBody,
    @CurrentUser() user: AuthUser,
  ) {
    const actor = await this.users.getOrCreate(user);
    return this.live.sendFollowUp(conversationId, actor.id, body);
  }
}
