import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { EASY_CASA_VOICE_E164, randomId } from './ids';
import { adminRolesFromRoles } from '@easycasa/shared';

import { RequiresAdminRole } from '../auth/admin-role.decorator';
import { RequiresCapability } from '../auth/capability.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';
import { CallbacksService } from './callbacks.service';
import type { StoredProfile, StoredRoute } from './callbacks.types';

function canOpenEleven(user: AuthUser): boolean {
  const roles = user.adminRoles ?? adminRolesFromRoles(user.roles.map(String));
  return roles.includes('operations') || roles.includes('superadmin');
}

@Controller('admin/callbacks')
@RequiresCapability('callbacks:read')
@RequiresAdminRole('support', 'operations')
export class CallbacksAdminController {
  constructor(
    private readonly callbacks: CallbacksService,
    private readonly users: UsersService,
  ) {}

  private async actor(user: AuthUser): Promise<string> {
    const row = await this.users.getOrCreate(user);
    return row.id;
  }

  @Get('summary')
  summary() {
    return this.callbacks.summary();
  }

  @Get('identity')
  identity() {
    return this.callbacks.identity();
  }

  @Get('inbox')
  inbox(
    @Query('chip') chip?: string,
    @Query('owner') owner?: string,
    @Query('line') line?: string,
    @Query('role') role?: string,
  ) {
    return this.callbacks.inbox({ chip, ownerId: owner, line, role });
  }

  @Get('calls')
  calls(@Query('page') page?: string) {
    return this.callbacks.calls(Math.max(1, Number(page) || 1));
  }

  @Get('routing')
  routing(@Query('number') number?: string) {
    return this.callbacks.routing(number || EASY_CASA_VOICE_E164);
  }

  @Put('routing')
  @RequiresCapability('callbacks:route')
  @RequiresAdminRole('operations')
  saveRouting(@Body() body: { calledNumber?: string; routes: StoredRoute[] }) {
    const called = body.calledNumber || EASY_CASA_VOICE_E164;
    const routes = (body.routes ?? []).map((r) => ({ ...r, id: r.id || randomId(), calledNumber: called, offerRealSlots: false }));
    return this.callbacks.saveRouting(called, routes);
  }

  @Get('team')
  team() {
    return this.callbacks.team();
  }

  @Get('staff')
  staff(@Query('q') q?: string) {
    return this.callbacks.staff(q ?? '');
  }

  @Post('team')
  @RequiresCapability('callbacks:route')
  @RequiresAdminRole('operations')
  saveTeam(@Body() body: StoredProfile) {
    return this.callbacks.saveProfile({ ...body, id: body.id || randomId() });
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.callbacks.detail(id, { elevenLabs: canOpenEleven(user) });
  }

  @Post(':id/confirm')
  confirm(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { slotStart: string; override?: boolean },
  ) {
    return this.actor(user).then((actorId) =>
      this.callbacks.confirm(id, actorId, body.slotStart, Boolean(body.override)),
    );
  }

  @Post(':id/reassign')
  reassign(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { ownerProfileId: string }) {
    return this.actor(user).then((actorId) => this.callbacks.reassign(id, actorId, body.ownerProfileId));
  }

  @Post(':id/no-answer')
  noAnswer(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.actor(user).then((actorId) => this.callbacks.setStatus(id, actorId, 'no_answer'));
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.actor(user).then((actorId) => this.callbacks.setStatus(id, actorId, 'cancelled'));
  }

  @Post(':id/done')
  done(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.actor(user).then((actorId) => this.callbacks.setStatus(id, actorId, 'done'));
  }
}
