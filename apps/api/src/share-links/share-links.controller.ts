import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';
import { CreateShareLinkDto } from './dto/create-share-link.dto';
import { ShareLinksService } from './share-links.service';

@Controller('share-links')
export class ShareLinksController {
  constructor(
    private readonly service: ShareLinksService,
    private readonly users: UsersService,
  ) {}

  @Roles('seller', 'agent', 'partner', 'pro_marketer')
  @Post()
  async create(@Body() dto: CreateShareLinkDto, @CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return this.service.create(dto, me.id, user);
  }

  @Roles('seller', 'agent', 'partner', 'pro_marketer')
  @Get('mine')
  async mine(@CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return this.service.listMine(me.id);
  }

  @Roles('seller', 'agent', 'partner', 'pro_marketer')
  @Post(':id/revoke')
  async revoke(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return this.service.revoke(id, me.id);
  }

  @Roles('seller', 'agent', 'partner', 'pro_marketer')
  @Get(':id/stats')
  async stats(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return this.service.stats(id, me.id, user);
  }

  /** Public SmartLink payload + view recording (must stay above :id catch-alls). */
  @Public()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get('public/:token')
  async publicPage(
    @Param('token') token: string,
    @Headers('x-ec-sl-visitor') visitorHeader?: string,
  ) {
    return this.service.getPublicPayload(token, visitorHeader ?? null);
  }
}
