import { Controller, Get, Param, Query } from '@nestjs/common';
import { IsBooleanString, IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

import { RequiresCapability } from '../auth/capability.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';
import { WhatsAppInboundAdminService } from './whatsapp-inbound-admin.service';

class ListInboundQuery {
  @IsOptional()
  @IsIn(['open', 'closed'])
  window?: 'open' | 'closed';

  @IsOptional()
  @IsBooleanString()
  autoReplied?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @IsString()
  messageType?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

class DetailInboundQuery {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

/**
 * EC-19 — read-only inbound WhatsApp viewer.
 * Capability `whatsapp:inbound:read` only — not bare `admin`.
 */
@Controller('admin/whatsapp/inbound')
@RequiresCapability('whatsapp:inbound:read')
export class WhatsAppInboundAdminController {
  constructor(
    private readonly inboundAdmin: WhatsAppInboundAdminService,
    private readonly users: UsersService,
  ) {}

  @Get()
  async list(@Query() query: ListInboundQuery) {
    return this.inboundAdmin.listThreads({
      window: query.window,
      autoReplied:
        query.autoReplied === 'true' ? true : query.autoReplied === 'false' ? false : undefined,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      messageType: query.messageType?.trim() || undefined,
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  /** EC WhatsApp — inbox totals (no sender PII). Must be registered before `:handle`. */
  @Get('summary')
  async summary() {
    return this.inboundAdmin.inboxSummary();
  }

  @Get(':handle')
  async detail(
    @Param('handle') handle: string,
    @Query() query: DetailInboundQuery,
    @CurrentUser() user: AuthUser,
  ) {
    const actor = await this.users.getOrCreate(user);
    return this.inboundAdmin.listMessagesForHandle(handle, actor.id, {
      cursor: query.cursor,
      limit: query.limit,
    });
  }
}
