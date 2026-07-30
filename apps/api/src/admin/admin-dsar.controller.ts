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
import { IsEmail, IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { asc, eq } from 'drizzle-orm';

import { RequiresAdminRole } from '../auth/admin-role.decorator';
import { RequiresCapability } from '../auth/capability.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { AdminAuditService } from '../authority/admin-audit.service';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { dsarAdminRequests, users } from '../db/schema';
import { DsarService } from '../privacy/dsar.service';
import { ErasureService } from '../privacy/erasure.service';
import { ERASURE_LEGAL_HOLDS_EN, ERASURE_LEGAL_HOLDS_IT } from '../privacy/legal-holds';
import { UsersService } from '../users/users.service';

class CreateDsarDto {
  @IsEmail()
  subjectEmail!: string;

  @IsOptional()
  @IsUUID()
  subjectUserId?: string;

  @IsIn(['access', 'erasure', 'rectification', 'objection'])
  requestType!: 'access' | 'erasure' | 'rectification' | 'objection';
}

class RespondDsarDto {
  @IsString()
  @MinLength(3)
  responseNote!: string;
}

@Controller('admin/dsar')
@RequiresCapability('admin')
@RequiresAdminRole('dpo')
export class AdminDsarController {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly audit: AdminAuditService,
    private readonly usersSvc: UsersService,
    private readonly dsar: DsarService,
    private readonly erasure: ErasureService,
  ) {}

  @Get('legal-holds')
  legalHolds() {
    return { it: [...ERASURE_LEGAL_HOLDS_IT], en: [...ERASURE_LEGAL_HOLDS_EN] };
  }

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const actor = await this.usersSvc.getOrCreate(user);
    const rows = await this.db
      .select()
      .from(dsarAdminRequests)
      .orderBy(asc(dsarAdminRequests.deadlineAt));
    await this.audit.record({
      actorUserId: actor.id,
      action: 'read',
      resourceType: 'dsar_request',
      resourceId: '*',
      reason: 'list DSAR queue',
    });
    const now = Date.now();
    return rows.map((r) => ({
      id: r.id,
      subjectUserId: r.subjectUserId,
      subjectEmail: r.subjectEmail,
      requestType: r.requestType,
      status: r.status,
      receivedAt: r.receivedAt.toISOString(),
      deadlineAt: r.deadlineAt.toISOString(),
      daysToDeadline: Math.ceil((r.deadlineAt.getTime() - now) / (24 * 60 * 60 * 1000)),
      urgent: r.deadlineAt.getTime() - now <= 7 * 24 * 60 * 60 * 1000 && r.status !== 'completed',
      responseNote: r.responseNote,
      responseSentAt: r.responseSentAt?.toISOString() ?? null,
    }));
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateDsarDto) {
    const actor = await this.usersSvc.getOrCreate(user);
    const received = new Date();
    const deadline = new Date(received);
    deadline.setMonth(deadline.getMonth() + 1);
    const rows = await this.db
      .insert(dsarAdminRequests)
      .values({
        subjectEmail: dto.subjectEmail,
        subjectUserId: dto.subjectUserId ?? null,
        requestType: dto.requestType,
        receivedAt: received,
        deadlineAt: deadline,
      })
      .returning();
    const row = rows[0]!;
    await this.audit.record({
      actorUserId: actor.id,
      action: 'create',
      resourceType: 'dsar_request',
      resourceId: row.id,
      subjectUserId: dto.subjectUserId ?? null,
      reason: `create ${dto.requestType}`,
    });
    return row;
  }

  @Post(':id/export')
  async export(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const actor = await this.usersSvc.getOrCreate(user);
    const row = await this.getRow(id);
    const subjectId = await this.resolveSubjectId(row);
    const payload = await this.dsar.export(subjectId);
    await this.audit.record({
      actorUserId: actor.id,
      action: 'export',
      resourceType: 'dsar_request',
      resourceId: id,
      subjectUserId: subjectId,
      reason: 'generate DSAR export (reuse /me path)',
    });
    return payload;
  }

  @Post(':id/erase')
  async erase(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const actor = await this.usersSvc.getOrCreate(user);
    const row = await this.getRow(id);
    if (row.requestType !== 'erasure') {
      throw new BadRequestException('erase only for erasure requests');
    }
    const subjectId = await this.resolveSubjectId(row);
    const report = await this.erasure.erase(subjectId);
    await this.db
      .update(dsarAdminRequests)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(eq(dsarAdminRequests.id, id));
    await this.audit.record({
      actorUserId: actor.id,
      action: 'erase',
      resourceType: 'dsar_request',
      resourceId: id,
      subjectUserId: subjectId,
      reason: 'execute erasure (reuse /me path)',
    });
    return {
      report,
      legalHolds: { it: [...ERASURE_LEGAL_HOLDS_IT], en: [...ERASURE_LEGAL_HOLDS_EN] },
    };
  }

  @Put(':id/response')
  async recordResponse(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RespondDsarDto,
  ) {
    const actor = await this.usersSvc.getOrCreate(user);
    await this.getRow(id);
    const now = new Date();
    await this.db
      .update(dsarAdminRequests)
      .set({
        responseNote: dto.responseNote,
        responseSentAt: now,
        status: 'completed',
        updatedAt: now,
      })
      .where(eq(dsarAdminRequests.id, id));
    await this.audit.record({
      actorUserId: actor.id,
      action: 'record_response',
      resourceType: 'dsar_request',
      resourceId: id,
      reason: dto.responseNote,
    });
    return { ok: true };
  }

  private async getRow(id: string) {
    const rows = await this.db
      .select()
      .from(dsarAdminRequests)
      .where(eq(dsarAdminRequests.id, id))
      .limit(1);
    if (!rows[0]) throw new NotFoundException('DSAR request not found');
    return rows[0];
  }

  private async resolveSubjectId(row: typeof dsarAdminRequests.$inferSelect): Promise<string> {
    if (row.subjectUserId) return row.subjectUserId;
    const found = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, row.subjectEmail))
      .limit(1);
    if (!found[0]) throw new BadRequestException('subject user not found for email');
    return found[0].id;
  }
}
