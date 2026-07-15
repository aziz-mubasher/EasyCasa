import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { Public } from '../auth/public.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';

@Controller()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.users.getOrCreate(user);
  }

  @Public()
  @Get('agents/:slug')
  agent(@Param('slug') slug: string) {
    return this.users.getBySlug(slug);
  }

  @Get('me/favorites')
  async favorites(@CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return this.users.listFavorites(me.id);
  }

  @Post('me/favorites/:listingId')
  async addFavorite(@CurrentUser() user: AuthUser, @Param('listingId') listingId: string) {
    const me = await this.users.getOrCreate(user);
    return this.users.addFavorite(me.id, listingId);
  }

  @Delete('me/favorites/:listingId')
  async removeFavorite(@CurrentUser() user: AuthUser, @Param('listingId') listingId: string) {
    const me = await this.users.getOrCreate(user);
    return this.users.removeFavorite(me.id, listingId);
  }

  @Get('me/saved-searches')
  async savedSearches(@CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return this.users.listSavedSearches(me.id);
  }

  @Post('me/saved-searches')
  async createSavedSearch(
    @CurrentUser() user: AuthUser,
    @Body() body: { name: string; query: unknown },
  ) {
    const me = await this.users.getOrCreate(user);
    return this.users.createSavedSearch(me.id, body.name, body.query);
  }
}
