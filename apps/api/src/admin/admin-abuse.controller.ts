import {
  Controller,
  Get,
  Query,
  Inject,
} from '@nestjs/common';
import { and, desc, eq, gte, sql } from 'drizzle-orm';

import { RequiresCapability } from '../auth/capability.decorator';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { AdminAuditService } from '../authority/admin-audit.service';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { media } from '../db/schema';
import { UsersService } from '../users/users.service';

/**
 * EC-S-T19 stage 1 — manual abuse tooling (flagged media + repeat offenders).
 * Capability: vo_moderation (ops) for now; separate abuse_moderation can split later.
 */
@Controller('admin/abuse')
@RequiresCapability('vo_moderation')
export class AdminAbuseController {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly audit: AdminAuditService,
    private readonly users: UsersService,
  ) {}

  @Roles('admin')
  @Get('flagged-media')
  async flaggedMedia(@CurrentUser() user: AuthUser) {
    const actor = await this.users.getOrCreate(user);
    const rows = await this.db
      .select({
        id: media.id,
        listingId: media.listingId,
        storageKey: media.storageKey,
        moderationFlag: media.moderationFlag,
        ownerUserId: media.ownerUserId,
        createdAt: media.createdAt,
      })
      .from(media)
      .where(sql`${media.moderationFlag} is not null`)
      .orderBy(desc(media.createdAt))
      .limit(100);
    await this.audit.record({
      actorUserId: actor.id,
      action: 'read',
      resourceType: 'media',
      resourceId: '*',
      reason: 'list flagged media (T19)',
    });
    return rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  @Roles('admin')
  @Get('repeat-offenders')
  async repeatOffenders(
    @CurrentUser() user: AuthUser,
    @Query('days') daysRaw?: string,
    @Query('min') minRaw?: string,
  ) {
    const actor = await this.users.getOrCreate(user);
    const days = Math.min(90, Math.max(1, Number(daysRaw) || 30));
    const min = Math.min(100, Math.max(2, Number(minRaw) || 3));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await this.db.execute(sql`
      SELECT subject_user_id AS "userId", COUNT(*)::int AS "eventCount"
      FROM moderation_events
      WHERE subject_user_id IS NOT NULL
        AND created_at >= ${since}
        AND kind IN ('IMAGE_DUPLICATE','IMAGE_NEAR_DUPLICATE')
      GROUP BY subject_user_id
      HAVING COUNT(*) >= ${min}
      ORDER BY COUNT(*) DESC
      LIMIT 100
    `);
    await this.audit.record({
      actorUserId: actor.id,
      action: 'read',
      resourceType: 'moderation_events',
      resourceId: '*',
      reason: `repeat offenders ${days}d min=${min}`,
    });
    return (rows as unknown as { rows?: unknown[] }).rows ?? rows;
  }
}
