import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';

import { RequiresAdminRole } from '../auth/admin-role.decorator';
import { RequiresCapability } from '../auth/capability.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { AdminAuditService } from '../authority/admin-audit.service';
import { UsersService } from '../users/users.service';
import { ProfessionalsService } from './professionals.service';
import {
  AddCredentialDto,
  CreateProfessionalDto,
  SetCredentialStatusDto,
  UpdateCoverageDto,
} from './dto';

@Controller('professionals')
@RequiresCapability('admin')
export class ProfessionalsController {
  constructor(
    private readonly service: ProfessionalsService,
    private readonly audit: AdminAuditService,
    private readonly users: UsersService,
  ) {}

  @Get()
  @RequiresAdminRole('operations', 'support')
  async list(@CurrentUser() user: AuthUser) {
    const actor = await this.users.getOrCreate(user);
    const rows = await this.service.list();
    await this.audit.record({
      actorUserId: actor.id,
      action: 'read',
      resourceType: 'professional',
      resourceId: '*',
      reason: 'list professionals / credentials',
    });
    return rows;
  }

  @Post()
  @RequiresAdminRole('operations')
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateProfessionalDto) {
    const actor = await this.users.getOrCreate(user);
    const pro = await this.service.create(dto);
    await this.audit.record({
      actorUserId: actor.id,
      action: 'create',
      resourceType: 'professional',
      resourceId: pro.id,
      reason: 'create professional',
    });
    return pro;
  }

  @Get(':id')
  @RequiresAdminRole('operations', 'support')
  async get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const actor = await this.users.getOrCreate(user);
    const pro = await this.service.get(id);
    await this.audit.record({
      actorUserId: actor.id,
      action: 'read',
      resourceType: 'professional',
      resourceId: id,
      reason: 'view professional',
    });
    return pro;
  }

  @Patch(':id/coverage')
  @RequiresAdminRole('operations')
  async setCoverage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCoverageDto,
  ) {
    const actor = await this.users.getOrCreate(user);
    const pro = await this.service.setCoverage(id, dto.coverageProvinces);
    await this.audit.record({
      actorUserId: actor.id,
      action: 'update_coverage',
      resourceType: 'professional',
      resourceId: id,
      reason: `coverage=${dto.coverageProvinces.join(',')}`,
    });
    return pro;
  }

  @Post(':id/credentials')
  @RequiresAdminRole('operations')
  async addCredential(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AddCredentialDto,
  ) {
    const actor = await this.users.getOrCreate(user);
    const pro = await this.service.addCredential(id, dto);
    await this.audit.record({
      actorUserId: actor.id,
      action: 'add_credential',
      resourceType: 'credential',
      resourceId: `${id}:${dto.type}`,
      reason: 'add credential pending verification',
    });
    return pro;
  }

  /** Admin: verify or reject a credential (reason required — EC-13). */
  @Put(':id/credentials/status')
  @RequiresAdminRole('operations')
  async setStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SetCredentialStatusDto,
  ) {
    const actor = await this.users.getOrCreate(user);
    const pro = await this.service.setCredentialStatus(id, dto.type, dto.status);
    await this.audit.record({
      actorUserId: actor.id,
      action: dto.status === 'VERIFIED' ? 'verify_credential' : 'reject_credential',
      resourceType: 'credential',
      resourceId: `${id}:${dto.type}`,
      reason: dto.reason,
    });
    return pro;
  }
}
