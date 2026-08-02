import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { crmRolesFromRoles, type CrmRole, type CrmRoleKind } from '@easycasa/shared';

import { RequiresCapability } from '../auth/capability.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';
import {
  CRM_ADMIN_ONLY,
  CRM_READ_ROLES,
  CRM_WRITE_ROLES,
  RequiresCrmRole,
} from './crm-role.decorator';
import { CrmRoleGuard } from './crm-role.guard';
import { CrmService } from './crm.service';
import {
  AttachCrmRoleDto,
  CreateCrmActivityDto,
  CreateCrmContactDto,
  CreateCrmTaskDto,
  ErasureRequestDto,
  PatchCrmContactDto,
  PatchCrmRoleDto,
  PatchCrmTaskDto,
} from './dto/crm.dto';

@Controller('admin/crm')
@RequiresCapability('admin')
@UseGuards(CrmRoleGuard)
export class CrmController {
  constructor(
    private readonly crm: CrmService,
    private readonly users: UsersService,
  ) {}

  private roles(user: AuthUser): CrmRole[] {
    return user.crmRoles ?? crmRolesFromRoles(user.roles.map(String));
  }

  private async actorId(user: AuthUser): Promise<string> {
    const row = await this.users.getOrCreate(user);
    return row.id;
  }

  @Get('dashboard')
  @RequiresCrmRole(...CRM_READ_ROLES)
  async dashboard(@CurrentUser() user: AuthUser) {
    return this.crm.dashboard(this.roles(user), await this.actorId(user));
  }

  @Get('settings')
  @RequiresCrmRole(...CRM_READ_ROLES)
  settings() {
    return this.crm.settings();
  }

  @Get('contacts')
  @RequiresCrmRole(...CRM_READ_ROLES)
  async listContacts(
    @CurrentUser() user: AuthUser,
    @Query('query') query?: string,
    @Query('role') role?: string,
    @Query('stage') stage?: string,
    @Query('owner') owner?: string,
    @Query('page') page?: string,
  ) {
    return this.crm.listContacts(this.roles(user), await this.actorId(user), {
      query,
      role,
      stage,
      owner,
      page: page ? Number(page) : 1,
    });
  }

  @Post('contacts')
  @RequiresCrmRole(...CRM_WRITE_ROLES)
  async createContact(@CurrentUser() user: AuthUser, @Body() body: CreateCrmContactDto) {
    return this.crm.createContact(this.roles(user), await this.actorId(user), body);
  }

  @Get('contacts/:id')
  @RequiresCrmRole(...CRM_READ_ROLES)
  async getContact(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.crm.getContact360(this.roles(user), await this.actorId(user), id);
  }

  @Patch('contacts/:id')
  @RequiresCrmRole(...CRM_WRITE_ROLES)
  async patchContact(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: PatchCrmContactDto,
  ) {
    return this.crm.patchContact(this.roles(user), await this.actorId(user), id, body);
  }

  @Post('contacts/:id/roles/:role')
  @RequiresCrmRole(...CRM_WRITE_ROLES)
  async attachRole(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('role') role: CrmRoleKind,
    @Body() body: AttachCrmRoleDto,
  ) {
    return this.crm.attachRole(this.roles(user), await this.actorId(user), id, role, body);
  }

  @Patch('contacts/:id/roles/:role')
  @RequiresCrmRole(...CRM_WRITE_ROLES)
  async patchRole(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('role') role: CrmRoleKind,
    @Body() body: PatchCrmRoleDto,
  ) {
    return this.crm.patchRole(this.roles(user), await this.actorId(user), id, role, body);
  }

  @Get('contacts/:id/activities')
  @RequiresCrmRole(...CRM_READ_ROLES)
  async listActivities(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('page') page?: string,
  ) {
    return this.crm.listActivities(
      this.roles(user),
      await this.actorId(user),
      id,
      page ? Number(page) : 1,
    );
  }

  @Post('contacts/:id/activities')
  @RequiresCrmRole(...CRM_WRITE_ROLES)
  async addActivity(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: CreateCrmActivityDto,
  ) {
    return this.crm.addActivity(this.roles(user), await this.actorId(user), id, body);
  }

  @Get('contacts/:id/export')
  @RequiresCrmRole(...CRM_ADMIN_ONLY)
  async export(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.crm.exportContact(this.roles(user), await this.actorId(user), id);
  }

  @Post('contacts/:id/erasure-request')
  @RequiresCrmRole(...CRM_ADMIN_ONLY)
  async erasure(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: ErasureRequestDto,
  ) {
    return this.crm.requestErasure(this.roles(user), await this.actorId(user), id, body.confirm);
  }

  @Get('tasks')
  @RequiresCrmRole(...CRM_READ_ROLES)
  async listTasks(
    @CurrentUser() user: AuthUser,
    @Query('assignee') assignee?: string,
    @Query('status') status?: 'open' | 'done' | 'cancelled',
    @Query('due') due?: string,
    @Query('page') page?: string,
  ) {
    return this.crm.listTasks(this.roles(user), await this.actorId(user), {
      assignee,
      status,
      due,
      page: page ? Number(page) : 1,
    });
  }

  @Post('tasks')
  @RequiresCrmRole(...CRM_WRITE_ROLES)
  async createTask(@CurrentUser() user: AuthUser, @Body() body: CreateCrmTaskDto) {
    return this.crm.createTask(this.roles(user), await this.actorId(user), body);
  }

  @Patch('tasks/:id')
  @RequiresCrmRole(...CRM_WRITE_ROLES)
  async patchTask(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: PatchCrmTaskDto,
  ) {
    return this.crm.patchTask(this.roles(user), await this.actorId(user), id, body);
  }

  @Get('pipelines/:role')
  @RequiresCrmRole(...CRM_READ_ROLES)
  async pipeline(@CurrentUser() user: AuthUser, @Param('role') role: CrmRoleKind) {
    return this.crm.pipeline(this.roles(user), await this.actorId(user), role);
  }
}
