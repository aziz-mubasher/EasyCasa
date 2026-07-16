import {
  Body, Controller, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { QueryListingDto } from './dto/query-listing.dto';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';

@Controller('listings')
export class ListingsController {
  constructor(
    private readonly listings: ListingsService,
    private readonly users: UsersService,
  ) {}

  @Public()
  @Get()
  search(@Query() q: QueryListingDto) {
    return this.listings.search(q);
  }

  /** Lightweight feed for Next.js sitemap generation (must stay above :slug). */
  @Public()
  @Get('sitemap')
  sitemap() {
    return this.listings.sitemapRefs();
  }

  @Public()
  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.listings.getBySlug(slug);
  }

  @Roles('seller', 'agent', 'partner', 'pro_marketer')
  @Post()
  async create(@Body() dto: CreateListingDto, @CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return this.listings.create(dto, me.id);
  }

  @Roles('seller', 'agent', 'partner', 'pro_marketer')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateListingDto,
    @CurrentUser() user: AuthUser,
  ) {
    const me = await this.users.getOrCreate(user);
    return this.listings.update(id, dto, user, me.id);
  }

  @Roles('seller', 'agent', 'partner', 'pro_marketer')
  @Post(':id/publish')
  async publish(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return this.listings.publish(id, user, me.id);
  }
}
