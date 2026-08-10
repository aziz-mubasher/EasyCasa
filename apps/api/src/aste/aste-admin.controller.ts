import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  IsBooleanString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

import { RequiresAdminRole } from '../auth/admin-role.decorator';
import { RequiresCapability } from '../auth/capability.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';
import { AsteAdminService } from './aste-admin.service';

class ListAnalysesQuery {
  @IsOptional()
  @IsIn(['draft', 'uploaded', 'processing', 'ready', 'failed'])
  status?: string;

  /** Failures tab: failed + stale processing. */
  @IsOptional()
  @IsBooleanString()
  failuresOnly?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(240)
  staleMinutes?: number;

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

class RevealBody {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  reason?: string;
}

/**
 * EC-26 — Aste ops admin. Behind admin capability + operations/support roles.
 * NOT gated by ASTE_ANALYSIS_ENABLED (ops must see dark-mode state).
 */
@Controller('admin/aste')
@RequiresCapability('admin')
@RequiresAdminRole('operations', 'support')
export class AsteAdminController {
  constructor(
    private readonly asteAdmin: AsteAdminService,
    private readonly users: UsersService,
  ) {}

  @Get('analyses')
  async list(@Query() query: ListAnalysesQuery) {
    return this.asteAdmin.list({
      status: query.status,
      failuresOnly: query.failuresOnly === 'true',
      staleMs:
        query.staleMinutes != null ? query.staleMinutes * 60_000 : undefined,
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  /** Waitlist aggregates — must be registered before `:id` routes. */
  @Get('waitlist/stats')
  async waitlistStats() {
    return this.asteAdmin.waitlistStats();
  }

  @Get('analyses/:id')
  async detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.asteAdmin.detail(id);
  }

  @Post('analyses/:id/reveal-identity')
  async revealIdentity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RevealBody,
    @CurrentUser() user: AuthUser,
  ) {
    const actor = await this.users.getOrCreate(user);
    return this.asteAdmin.revealIdentity(id, actor.id, body.reason);
  }

  @Post('analyses/:id/reveal-filenames')
  async revealFilenames(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RevealBody,
    @CurrentUser() user: AuthUser,
  ) {
    const actor = await this.users.getOrCreate(user);
    return this.asteAdmin.revealFilenames(id, actor.id, body.reason);
  }

  @Post('analyses/:id/rerun')
  async rerun(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    const actor = await this.users.getOrCreate(user);
    return this.asteAdmin.rerun(id, actor.id);
  }
}
