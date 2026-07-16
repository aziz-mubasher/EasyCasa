import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { MessagingService } from './messaging.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';

class StartDto {
  @IsString() listingId!: string;
  @IsString() @MinLength(2) message!: string;
}
class MessageDto {
  @IsString() @MinLength(1) body!: string;
}

@Controller('conversations')
export class MessagingController {
  constructor(
    private readonly messaging: MessagingService,
    private readonly users: UsersService,
  ) {}

  @Post()
  async start(@CurrentUser() user: AuthUser, @Body() dto: StartDto) {
    const me = await this.users.getOrCreate(user);
    return this.messaging.startConversation(me.id, dto.listingId, dto.message);
  }

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return this.messaging.listConversations(me.id);
  }

  @Get(':id/messages')
  async messages(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const me = await this.users.getOrCreate(user);
    return this.messaging.listMessages(id, me.id);
  }

  @Post(':id/messages')
  async send(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: MessageDto) {
    const me = await this.users.getOrCreate(user);
    return this.messaging.sendMessage(id, me.id, dto.body);
  }
}
