import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { IsIn, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import type { SavedSearchCriteria } from '../alerts/domain/types';
import { UsersService } from '../users/users.service';
import { SavedSearchesService } from './saved-searches.service';

const FREQ = ['instant', 'daily', 'off'] as const;

export class CreateSavedSearchDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  /** Phase 20 criteria. Prefer this; `query` accepted for legacy clients. */
  @IsOptional()
  @IsObject()
  criteria?: SavedSearchCriteria;

  @IsOptional()
  @IsObject()
  query?: SavedSearchCriteria;

  @IsIn(FREQ)
  frequency!: (typeof FREQ)[number];
}

export class SetFrequencyDto {
  @IsIn(FREQ)
  frequency!: (typeof FREQ)[number];
}

@Controller('me/saved-searches')
export class SavedSearchesController {
  constructor(
    private readonly service: SavedSearchesService,
    private readonly users: UsersService,
  ) {}

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateSavedSearchDto) {
    const me = await this.users.getOrCreate(user);
    const criteria = dto.criteria ?? dto.query ?? { filters: {} };
    return this.service.create(me.id, {
      name: dto.name,
      criteria,
      frequency: dto.frequency,
    });
  }

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return this.service.list(me.id);
  }

  @Put(':id/frequency')
  async setFrequency(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SetFrequencyDto,
  ) {
    const me = await this.users.getOrCreate(user);
    return this.service.setFrequency(me.id, id, dto.frequency);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const me = await this.users.getOrCreate(user);
    await this.service.remove(me.id, id);
    return { ok: true as const };
  }
}
