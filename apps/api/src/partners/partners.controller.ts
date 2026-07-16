import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { PartnersService } from './partners.service';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';

@Controller('partner')
@Roles('partner', 'pro_marketer')
export class PartnersController {
  constructor(
    private readonly partners: PartnersService,
    private readonly users: UsersService,
  ) {}

  @Get('dashboard')
  async dashboard(@CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return this.partners.dashboard(me.id);
  }

  @Get('leads')
  async leads(@CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return this.partners.listLeads(me.id);
  }

  @Patch('leads/:id')
  async update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { status: string }) {
    const me = await this.users.getOrCreate(user);
    return this.partners.updateLeadStatus(me.id, id, body.status);
  }

  @Get('payouts')
  async payouts(@CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return this.partners.listPayouts(me.id);
  }
}
