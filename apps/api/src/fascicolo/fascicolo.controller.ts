import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { FascicoloService } from './fascicolo.service';
import { AddDocumentDto } from './dto';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { properties } from '../db/schema';
import { eq } from 'drizzle-orm';
import { UsersService } from '../users/users.service';
import { FASCICOLO_REPOSITORY } from './fascicolo.service';
import type { FascicoloRepository } from './domain/ports';

@Controller('properties/:propertyId/fascicolo')
export class FascicoloController {
  constructor(
    private readonly service: FascicoloService,
    private readonly users: UsersService,
    @Inject(DRIZZLE) private readonly db: Db,
    @Inject(FASCICOLO_REPOSITORY) private readonly repo: FascicoloRepository,
  ) {}

  private async assertOwnerOrAdmin(user: AuthUser, propertyId: string) {
    const me = await this.users.getOrCreate(user);
    const rows = await this.db
      .select()
      .from(properties)
      .where(eq(properties.id, propertyId))
      .limit(1);
    const p = rows[0];
    if (!p) return; // service will 404
    if (user.roles.includes('admin') || p.ownerId === me.id) return;
    throw new ForbiddenException('not your property');
  }

  @Get()
  async view(@CurrentUser() user: AuthUser, @Param('propertyId') propertyId: string) {
    await this.assertOwnerOrAdmin(user, propertyId);
    return this.service.view(propertyId);
  }

  @Get('gates')
  async gates(@CurrentUser() user: AuthUser, @Param('propertyId') propertyId: string) {
    await this.assertOwnerOrAdmin(user, propertyId);
    return this.service.evaluate(propertyId);
  }

  @Post('documents')
  async addDocument(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Body() dto: AddDocumentDto,
  ) {
    await this.assertOwnerOrAdmin(user, propertyId);
    return this.service.addDocument(propertyId, dto);
  }

  /** Ops verification — document only satisfies a gate once verified. */
  @Post('documents/:code/verify')
  @Roles('admin')
  async verify(
    @Param('propertyId') propertyId: string,
    @Param('code') code: string,
  ) {
    await this.repo.markVerified(propertyId, code as Parameters<FascicoloRepository['markVerified']>[1]);
    return this.service.evaluate(propertyId);
  }
}
