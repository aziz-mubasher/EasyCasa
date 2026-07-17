import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { PropertiesService } from './properties.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';

class CreatePropertyDto {
  @IsIn(['sale', 'rent']) dealType!: 'sale' | 'rent';
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsBoolean() inCondominio?: boolean;
}

@Controller()
export class PropertiesController {
  constructor(
    private readonly properties: PropertiesService,
    private readonly users: UsersService,
  ) {}

  /** Phase 9 owner portal — summary list. */
  @Get('me/properties')
  async meProperties(@CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    const rows = await this.properties.listForOwner(me.id);
    return rows.map((p) => ({
      id: p.id,
      dealType: p.dealType,
      status: p.status,
      title: p.title ?? null,
      inCondominio: p.inCondominio,
    }));
  }

  @Get('properties')
  async mine(@CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return this.properties.listForOwner(me.id);
  }

  @Post('properties')
  async create(@CurrentUser() user: AuthUser, @Body() body: CreatePropertyDto) {
    const me = await this.users.getOrCreate(user);
    const rows = await this.properties.create(me.id, body);
    return rows[0];
  }

  @Get('properties/:id')
  async one(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const me = await this.users.getOrCreate(user);
    const p = await this.properties.get(id);
    if (!user.roles.includes('admin') && p.ownerId !== me.id) {
      throw new ForbiddenException('not your property');
    }
    return p;
  }
}
