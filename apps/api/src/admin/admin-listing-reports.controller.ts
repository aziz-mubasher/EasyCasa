import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { asc, eq } from 'drizzle-orm';

import { RequiresAdminRole } from '../auth/admin-role.decorator';
import { RequiresCapability } from '../auth/capability.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { AdminAuditService } from '../authority/admin-audit.service';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { listingReports, listings, users } from '../db/schema';
import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';

class CreateReportDto {
  @IsUUID()
  listingId!: string;

  @IsString()
  @MinLength(2)
  category!: string;

  @IsOptional()
  @IsString()
  freeText?: string;

  @IsOptional()
  @IsString()
  reporterEmail?: string;
}

class DecideReportDto {
  @IsIn(['removed', 'kept', 'more_info'])
  decision!: 'removed' | 'kept' | 'more_info';

  @IsString()
  @MinLength(10)
  motivation!: string;
}

@Controller('admin/listing-reports')
@RequiresCapability('admin')
@RequiresAdminRole('operations')
export class AdminListingReportsController {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly audit: AdminAuditService,
    private readonly usersSvc: UsersService,
    private readonly email: EmailService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const actor = await this.usersSvc.getOrCreate(user);
    const rows = await this.db
      .select()
      .from(listingReports)
      .orderBy(asc(listingReports.createdAt));
    await this.audit.record({
      actorUserId: actor.id,
      action: 'read',
      resourceType: 'listing_report',
      resourceId: '*',
      reason: 'list listing reports',
    });
    return rows.map((r) => ({
      id: r.id,
      listingId: r.listingId,
      reporterUserId: r.reporterUserId,
      reporterEmail: r.reporterEmail,
      category: r.category,
      freeText: r.freeText,
      status: r.status,
      decisionMotivation: r.decisionMotivation,
      decidedAt: r.decidedAt?.toISOString() ?? null,
      notifiedAt: r.notifiedAt?.toISOString() ?? null,
      contestReceivedAt: r.contestReceivedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateReportDto) {
    const actor = await this.usersSvc.getOrCreate(user);
    const listing = await this.db
      .select({ id: listings.id })
      .from(listings)
      .where(eq(listings.id, dto.listingId))
      .limit(1);
    if (!listing[0]) throw new NotFoundException('listing not found');
    const rows = await this.db
      .insert(listingReports)
      .values({
        listingId: dto.listingId,
        category: dto.category,
        freeText: dto.freeText ?? null,
        reporterEmail: dto.reporterEmail ?? null,
      })
      .returning();
    const row = rows[0]!;
    await this.audit.record({
      actorUserId: actor.id,
      action: 'create',
      resourceType: 'listing_report',
      resourceId: row.id,
      reason: `report ${dto.category}`,
    });
    return row;
  }

  @Put(':id/decision')
  async decide(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: DecideReportDto,
  ) {
    if (!dto.motivation?.trim() || dto.motivation.trim().length < 10) {
      throw new BadRequestException('motivation required on every decision');
    }
    const actor = await this.usersSvc.getOrCreate(user);
    const rows = await this.db
      .select()
      .from(listingReports)
      .where(eq(listingReports.id, id))
      .limit(1);
    const report = rows[0];
    if (!report) throw new NotFoundException('report not found');
    if (report.status !== 'open') throw new BadRequestException('report already decided');

    const now = new Date();
    let notifiedAt: Date | null = null;

    if (dto.decision === 'removed') {
      await this.db
        .update(listings)
        .set({ status: 'archived', updatedAt: now })
        .where(eq(listings.id, report.listingId));
      const listing = await this.db
        .select({ agentId: listings.agentId, title: listings.title, slug: listings.slug })
        .from(listings)
        .where(eq(listings.id, report.listingId))
        .limit(1);
      const agentId = listing[0]?.agentId;
      if (agentId) {
        const owner = await this.db
          .select({ email: users.email })
          .from(users)
          .where(eq(users.id, agentId))
          .limit(1);
        const to = owner[0]?.email;
        if (to) {
          await this.email.sendText(
            to,
            'EasyCasa — rimozione annuncio (DSA)',
            `Il tuo annuncio "${listing[0]?.title ?? report.listingId}" è stato rimosso.\n\nMotivazione:\n${dto.motivation}\n\nPuoi contestare scrivendo a legal@easycasaita.com entro 15 giorni.`,
          );
          notifiedAt = now;
        }
      }
    }

    await this.db
      .update(listingReports)
      .set({
        status: dto.decision,
        decisionMotivation: dto.motivation.trim(),
        decidedAt: now,
        decidedBy: actor.id,
        notifiedAt,
      })
      .where(eq(listingReports.id, id));

    await this.audit.record({
      actorUserId: actor.id,
      action: `decide_${dto.decision}`,
      resourceType: 'listing_report',
      resourceId: id,
      reason: dto.motivation.trim(),
    });

    return { ok: true, notifiedAt: notifiedAt?.toISOString() ?? null };
  }
}
