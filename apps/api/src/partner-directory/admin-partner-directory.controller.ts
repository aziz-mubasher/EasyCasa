import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

import { RequiresCapability } from '../auth/capability.decorator';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { AdminAuditService } from '../authority/admin-audit.service';
import { UsersService } from '../users/users.service';
import { PartnerDirectoryService } from '../partner-directory/partner-directory.service';

class PartnerDto {
  @IsString()
  @MinLength(1)
  category!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  province!: string;

  @IsOptional()
  @IsString()
  credentials?: string;

  @IsString()
  @MinLength(1)
  contact!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  /** G3 row 9 — flat-fee labelled placement (preferential sort). */
  @IsOptional()
  @IsBoolean()
  paidPlacement?: boolean;
}

@Controller('admin/partner-directory')
@RequiresCapability('partner_directory')
export class AdminPartnerDirectoryController {
  constructor(
    private readonly directory: PartnerDirectoryService,
    private readonly audit: AdminAuditService,
    private readonly users: UsersService,
  ) {}

  @Roles('admin')
  @Get()
  list() {
    return this.directory.listAdmin();
  }

  @Roles('admin')
  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body: PartnerDto) {
    const me = await this.users.getOrCreate(user);
    const row = await this.directory.create(body);
    await this.audit.record({
      actorUserId: me.id,
      action: 'partner_directory.create',
      resourceType: 'partner_directory',
      resourceId: row?.id,
    });
    return row;
  }

  @Roles('admin')
  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: PartnerDto,
  ) {
    const me = await this.users.getOrCreate(user);
    const row = await this.directory.update(id, body);
    await this.audit.record({
      actorUserId: me.id,
      action: 'partner_directory.update',
      resourceType: 'partner_directory',
      resourceId: id,
    });
    return row;
  }

  @Roles('admin')
  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    const me = await this.users.getOrCreate(user);
    const res = await this.directory.remove(id);
    await this.audit.record({
      actorUserId: me.id,
      action: 'partner_directory.delete',
      resourceType: 'partner_directory',
      resourceId: id,
    });
    return res;
  }
}
