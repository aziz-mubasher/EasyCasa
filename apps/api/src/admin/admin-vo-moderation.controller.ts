import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UnprocessableEntityException,
} from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';

import { RequiresCapability } from '../auth/capability.decorator';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { AdminAuditService } from '../authority/admin-audit.service';
import { UsersService } from '../users/users.service';
import { VerifiedOwnerService } from '../verified-owner/verified-owner.service';

class RejectVoDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}

/**
 * EC-S-T15 — Verified Owner moderation queue.
 * Capability `vo_moderation` (operations/superadmin) — not AML.
 */
@Controller('admin/vo')
@RequiresCapability('vo_moderation')
export class AdminVoModerationController {
  constructor(
    private readonly vo: VerifiedOwnerService,
    private readonly audit: AdminAuditService,
    private readonly users: UsersService,
  ) {}

  @Roles('admin')
  @Get('queue')
  async queue(
    @CurrentUser() user: AuthUser,
    @Query('state') state?: string,
  ) {
    const actor = await this.users.getOrCreate(user);
    const states: Array<'submitted' | 'in_review'> =
      state === 'submitted'
        ? ['submitted']
        : state === 'in_review'
          ? ['in_review']
          : ['submitted', 'in_review'];
    const rows = await this.vo.listQueue(states);
    await this.audit.record({
      actorUserId: actor.id,
      action: 'read',
      resourceType: 'verified_owner_case',
      resourceId: '*',
      reason: `list VO queue (${states.join(',')})`,
    });
    return rows;
  }

  @Roles('admin')
  @Get(':caseId')
  async detail(
    @CurrentUser() user: AuthUser,
    @Param('caseId', ParseUUIDPipe) caseId: string,
  ) {
    const actor = await this.users.getOrCreate(user);
    const detail = await this.vo.getCaseDetail(caseId);
    await this.audit.record({
      actorUserId: actor.id,
      action: 'view_document',
      resourceType: 'verified_owner_case',
      resourceId: caseId,
      subjectUserId: detail.sellerUserId,
      reason: 'view VO case + docs',
    });
    return detail;
  }

  @Roles('admin')
  @Post(':caseId/claim')
  async claim(
    @CurrentUser() user: AuthUser,
    @Param('caseId', ParseUUIDPipe) caseId: string,
  ) {
    const actor = await this.users.getOrCreate(user);
    const before = await this.vo.getCaseDetail(caseId);
    const updated = await this.vo.applyTransition({
      caseId,
      event: 'CLAIM',
      actor: 'vo_moderator',
      actorUserId: actor.id,
    });
    await this.audit.record({
      actorUserId: actor.id,
      action: 'claim',
      resourceType: 'verified_owner_case',
      resourceId: caseId,
      subjectUserId: before.sellerUserId,
      reason: 'claim VO case for review',
    });
    return updated;
  }

  @Roles('admin')
  @Post(':caseId/verify')
  async verify(
    @CurrentUser() user: AuthUser,
    @Param('caseId', ParseUUIDPipe) caseId: string,
  ) {
    const actor = await this.users.getOrCreate(user);
    const updated = await this.vo.applyTransition({
      caseId,
      event: 'VERIFY',
      actor: 'vo_moderator',
      actorUserId: actor.id,
    });
    await this.audit.record({
      actorUserId: actor.id,
      action: 'verify',
      resourceType: 'verified_owner_case',
      resourceId: caseId,
      reason: 'VO verified',
    });
    return updated;
  }

  @Roles('admin')
  @Post(':caseId/reject')
  async reject(
    @CurrentUser() user: AuthUser,
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Body() dto: RejectVoDto,
  ) {
    if (!dto.reason?.trim()) {
      throw new UnprocessableEntityException('reason required');
    }
    const actor = await this.users.getOrCreate(user);
    const updated = await this.vo.applyTransition({
      caseId,
      event: 'REJECT',
      actor: 'vo_moderator',
      actorUserId: actor.id,
      reason: dto.reason.trim(),
    });
    await this.audit.record({
      actorUserId: actor.id,
      action: 'reject',
      resourceType: 'verified_owner_case',
      resourceId: caseId,
      reason: dto.reason.trim(),
    });
    return updated;
  }
}
