import { Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { listings } from '../db/schema';
import { Roles } from '../auth/roles.decorator';

@Controller('admin')
@Roles('admin')
export class AdminController {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  @Get('stats')
  async stats() {
    const rows = await this.db
      .select({ status: listings.status, n: sql<number>`count(*)::int` })
      .from(listings)
      .groupBy(listings.status);
    return { listingsByStatus: rows };
  }

  @Post('listings/:id/archive')
  archive(@Param('id') id: string) {
    return this.db.update(listings).set({ status: 'archived' }).where(eq(listings.id, id)).returning();
  }
}
