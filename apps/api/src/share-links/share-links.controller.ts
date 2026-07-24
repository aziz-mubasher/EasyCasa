import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';
import { CreateShareLinkDto, RecordShareViewDto } from './dto/share-link.dto';
import { ShareLinksService } from './share-links.service';

@Controller()
export class ShareLinksController {
  constructor(
    private readonly shareLinks: ShareLinksService,
    private readonly users: UsersService,
  ) {}

  @Roles('seller', 'agent', 'partner', 'pro_marketer')
  @Post('listings/:listingId/share-links')
  async create(
    @Param('listingId') listingId: string,
    @Body() dto: CreateShareLinkDto,
    @CurrentUser() user: AuthUser,
  ) {
    const me = await this.users.getOrCreate(user);
    return this.shareLinks.create(listingId, me.id, user, dto);
  }

  @Roles('seller', 'agent', 'partner', 'pro_marketer')
  @Get('me/share-links')
  async listMine(
    @CurrentUser() user: AuthUser,
    @Query('listingId') listingId?: string,
  ) {
    const me = await this.users.getOrCreate(user);
    return this.shareLinks.listMine(me.id, listingId?.trim() || undefined);
  }

  @Roles('seller', 'agent', 'partner', 'pro_marketer')
  @Post('share-links/:id/revoke')
  async revoke(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return this.shareLinks.revoke(id, me.id, user);
  }

  /** Public SmartLink payload — no auth; does not increment views (SSR + OG). */
  @Public()
  @Get('share/:token')
  getPublic(@Param('token') token: string) {
    return this.shareLinks.getPublicPayload(token);
  }

  /** Records a page view from the anonymous visitor cookie (client or edge). */
  @Public()
  @Post('share/:token/view')
  recordView(@Param('token') token: string, @Body() dto: RecordShareViewDto) {
    return this.shareLinks.recordView(token, dto.visitorToken);
  }
}
