import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { and, desc, eq, sql } from 'drizzle-orm';

import { RequiresCapability } from '../auth/capability.decorator';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { AdminAuditService } from '../authority/admin-audit.service';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { listings, media, users } from '../db/schema';
import { recordModerationEvent } from '../media/dupdetect.client';
import { SearchService } from '../search/search.service';
import { UsersService } from '../users/users.service';

class SuspendDto {
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason!: string;
}

/**
 * EC-S-T19 — manual abuse tooling (flagged media + repeat offenders + suspend).
 * Capability: vo_moderation (ops) for now; separate abuse_moderation can split later.
 */
@Controller('admin/abuse')
@RequiresCapability('vo_moderation')
export class AdminAbuseController {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly audit: AdminAuditService,
    private readonly users: UsersService,
    private readonly search: SearchService,
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

  /**
   * EC-S-T19.2 — suspend seller: set suspended_at, unpublish all owned listings, audit + moderation event.
   */
  @Roles('admin')
  @Post('users/:userId/suspend')
  async suspend(
    @CurrentUser() user: AuthUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: SuspendDto,
  ) {
    const actor = await this.users.getOrCreate(user);
    const target = await this.users.findById(userId);
    if (!target) throw new NotFoundException('user not found');
    if (target.suspendedAt) {
      throw new BadRequestException('user already suspended');
    }
    const reason = dto.reason.trim();
    const now = new Date();
    await this.db
      .update(users)
      .set({ suspendedAt: now, suspendReason: reason, updatedAt: now })
      .where(eq(users.id, userId));

    const owned = await this.db
      .select({ id: listings.id })
      .from(listings)
      .where(and(eq(listings.ownerUserId, userId), eq(listings.status, 'published')));

    for (const row of owned) {
      await this.db
        .update(listings)
        .set({ status: 'unpublished', unpublishedAt: now, updatedAt: now })
        .where(eq(listings.id, row.id));
      try {
        await this.search.remove(row.id);
      } catch {
        // fail-soft Meili; listing already unpublished in DB
      }
    }

    await recordModerationEvent(this.db, {
      kind: 'USER_SUSPEND',
      actorUserId: actor.id,
      subjectUserId: userId,
      detail: { reason, unpublishedListingIds: owned.map((r) => r.id) },
    });
    await this.audit.record({
      actorUserId: actor.id,
      action: 'suspend',
      resourceType: 'user',
      resourceId: userId,
      subjectUserId: userId,
      reason,
    });
    return {
      userId,
      suspendedAt: now.toISOString(),
      suspendReason: reason,
      unpublishedCount: owned.length,
    };
  }

  @Roles('admin')
  @Post('users/:userId/unsuspend')
  async unsuspend(
    @CurrentUser() user: AuthUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    const actor = await this.users.getOrCreate(user);
    const target = await this.users.findById(userId);
    if (!target) throw new NotFoundException('user not found');
    if (!target.suspendedAt) {
      throw new BadRequestException('user is not suspended');
    }
    const now = new Date();
    await this.db
      .update(users)
      .set({ suspendedAt: null, suspendReason: null, updatedAt: now })
      .where(eq(users.id, userId));

    await recordModerationEvent(this.db, {
      kind: 'USER_UNSUSPEND',
      actorUserId: actor.id,
      subjectUserId: userId,
      detail: {},
    });
    await this.audit.record({
      actorUserId: actor.id,
      action: 'unsuspend',
      resourceType: 'user',
      resourceId: userId,
      subjectUserId: userId,
      reason: 'admin unsuspend',
    });
    return { userId, suspendedAt: null };
  }
}
