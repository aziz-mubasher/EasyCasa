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
import { IsString, IsUrl, IsUUID, MinLength } from 'class-validator';
import { asc, eq } from 'drizzle-orm';

import { RequiresAdminRole } from '../auth/admin-role.decorator';
import { RequiresCapability } from '../auth/capability.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { AdminAuditService } from '../authority/admin-audit.service';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { identityReviewRequests, users } from '../db/schema';
import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';

class CreateIdentityReviewDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @MinLength(2)
  accountName!: string;

  @IsUrl()
  documentUrl!: string;
}

class RejectIdentityDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}

@Controller('admin/identity-reviews')
@RequiresCapability('admin')
@RequiresAdminRole('operations')
export class AdminIdentityReviewsController {
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
      .from(identityReviewRequests)
      .where(eq(identityReviewRequests.status, 'pending'))
      .orderBy(asc(identityReviewRequests.createdAt));
    await this.audit.record({
      actorUserId: actor.id,
      action: 'read',
      resourceType: 'identity_review',
      resourceId: '*',
      reason: 'list pending identity reviews',
    });
    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      accountName: r.accountName,
      documentUrl: r.documentUrl,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  @Get(':id')
  async view(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const actor = await this.usersSvc.getOrCreate(user);
    const row = await this.getRow(id);
    await this.audit.record({
      actorUserId: actor.id,
      action: 'view_document',
      resourceType: 'identity_review',
      resourceId: id,
      subjectUserId: row.userId,
      reason: 'view identity document',
    });
    return {
      id: row.id,
      userId: row.userId,
      accountName: row.accountName,
      documentUrl: row.documentUrl,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    };
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateIdentityReviewDto) {
    const actor = await this.usersSvc.getOrCreate(user);
    const subject = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, dto.userId))
      .limit(1);
    if (!subject[0]) throw new NotFoundException('user not found');
    const rows = await this.db
      .insert(identityReviewRequests)
      .values({
        userId: dto.userId,
        accountName: dto.accountName,
        documentUrl: dto.documentUrl,
      })
      .returning();
    const row = rows[0]!;
    await this.audit.record({
      actorUserId: actor.id,
      action: 'create',
      resourceType: 'identity_review',
      resourceId: row.id,
      subjectUserId: dto.userId,
      reason: 'enqueue identity review',
    });
    return row;
  }

  @Put(':id/verify')
  async verify(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const actor = await this.usersSvc.getOrCreate(user);
    const row = await this.getRow(id);
    if (row.status !== 'pending') throw new BadRequestException('already decided');
    const now = new Date();
    await this.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          identityVerifiedAt: now,
          identityMethod: 'manual',
          updatedAt: now,
        })
        .where(eq(users.id, row.userId));
      await tx
        .update(identityReviewRequests)
        .set({
          status: 'verified',
          decidedAt: now,
          decidedBy: actor.id,
          documentUrl: '', // delete document in same transaction
        })
        .where(eq(identityReviewRequests.id, id));
    });
    await this.audit.record({
      actorUserId: actor.id,
      action: 'verify',
      resourceType: 'identity_review',
      resourceId: id,
      subjectUserId: row.userId,
      reason: 'manual identity verified; document cleared',
    });
    return { ok: true };
  }

  @Put(':id/reject')
  async reject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RejectIdentityDto,
  ) {
    const actor = await this.usersSvc.getOrCreate(user);
    const row = await this.getRow(id);
    if (row.status !== 'pending') throw new BadRequestException('already decided');
    const now = new Date();
    await this.db.transaction(async (tx) => {
      await tx
        .update(identityReviewRequests)
        .set({
          status: 'rejected',
          rejectReason: dto.reason,
          decidedAt: now,
          decidedBy: actor.id,
          documentUrl: '',
        })
        .where(eq(identityReviewRequests.id, id));
    });
    const subject = await this.db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, row.userId))
      .limit(1);
    const to = subject[0]?.email;
    if (to) {
      await this.email.sendText(
        to,
        'EasyCasa — verifica identità non riuscita',
        `La verifica del documento non è andata a buon fine.\n\nMotivo: ${dto.reason}\n\nPuoi caricare di nuovo un documento valido.`,
      );
    }
    await this.audit.record({
      actorUserId: actor.id,
      action: 'reject',
      resourceType: 'identity_review',
      resourceId: id,
      subjectUserId: row.userId,
      reason: dto.reason,
    });
    return { ok: true };
  }

  private async getRow(id: string) {
    const rows = await this.db
      .select()
      .from(identityReviewRequests)
      .where(eq(identityReviewRequests.id, id))
      .limit(1);
    if (!rows[0]) throw new NotFoundException('identity review not found');
    return rows[0];
  }
}
