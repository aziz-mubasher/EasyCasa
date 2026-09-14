import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { WA_AI_LOCALES } from '@easycasa/shared';

import { RequiresCapability } from '../auth/capability.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';
import { WhatsAppAiService } from './whatsapp-ai.service';

class ComposeBody {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  prompt!: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsBoolean()
  includeThread?: boolean;
}

class TranslateBody {
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  text?: string;

  @IsOptional()
  @IsString()
  messageId?: string;
}

/**
 * K EC 7.3 — Claude drafts + inbound simple-English translate.
 * Never sends on WhatsApp. Capability is inbox read (same as viewing the thread).
 */
@Controller('admin/whatsapp/ai')
@RequiresCapability('whatsapp:inbound:read')
export class WhatsAppAiController {
  constructor(
    private readonly ai: WhatsAppAiService,
    private readonly users: UsersService,
  ) {}

  @Get('status')
  status() {
    return this.ai.status();
  }

  @Get('locales')
  locales() {
    return { items: [...WA_AI_LOCALES] };
  }

  @Post(':handle/compose')
  async compose(
    @Param('handle') handle: string,
    @Body() body: ComposeBody,
    @CurrentUser() user: AuthUser,
  ) {
    const actor = await this.users.getOrCreate(user);
    return this.ai.compose({
      handle,
      actorUserId: actor.id,
      prompt: body.prompt,
      locale: body.locale,
      includeThread: body.includeThread,
    });
  }

  @Post(':handle/translate')
  async translate(
    @Param('handle') handle: string,
    @Body() body: TranslateBody,
    @CurrentUser() user: AuthUser,
  ) {
    const actor = await this.users.getOrCreate(user);
    return this.ai.translate({
      handle,
      actorUserId: actor.id,
      text: body.text,
      messageId: body.messageId,
    });
  }
}
