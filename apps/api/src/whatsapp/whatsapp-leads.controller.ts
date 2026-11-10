import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

import { RequiresAdminRole } from '../auth/admin-role.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { RequiresCapability } from '../auth/capability.decorator';
import { UsersService } from '../users/users.service';
import { WaPresenceService } from './wa-presence';
import { WhatsAppInboundAdminService } from './whatsapp-inbound-admin.service';
import { WhatsAppIntakeService } from './whatsapp-intake.service';
import { WhatsAppLeadAlertService } from './whatsapp-lead-alert.service';

class AssignBody {
  @IsOptional()
  @IsUUID()
  ownerUserId?: string;
}

class CloseBody {
  @IsString()
  reason!: string;
}

class CallDecisionBody {
  @IsIn(['confirm', 'offer', 'cancel', 'done', 'no_show'])
  action!: 'confirm' | 'offer' | 'cancel' | 'done' | 'no_show';

  @IsOptional()
  @IsString()
  requestedSlot?: string;

  @IsOptional()
  @IsString()
  offeredSlot?: string;

  @IsOptional()
  @IsString()
  callLanguage?: string;

  @IsOptional()
  @IsString({ each: true })
  approvedLocales?: string[];
}

class TranslateAssistBody {
  @IsString()
  text!: string;

  @IsString()
  locale!: string;

  @IsOptional()
  @IsIn(['to_customer', 'to_italian'])
  direction?: 'to_customer' | 'to_italian';
}

class PresenceBody {
  @IsBoolean()
  available!: boolean;
}

class RosterBody {
  @IsIn(['primary', 'backup', 'owner'])
  role!: 'primary' | 'backup' | 'owner';

  @IsArray()
  @IsInt({ each: true })
  days!: number[];

  @IsInt()
  startMin!: number;

  @IsInt()
  endMin!: number;

  @IsString()
  email!: string;

  @IsOptional()
  @IsString()
  waPhone?: string;

  @IsBoolean()
  active!: boolean;
}

class ListLeadsQuery {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @IsOptional()
  @IsString()
  product?: string;
}

/** EC-WA-INTAKE-2 — #whatsapp/leads. Registered beside inbound so `:handle` cannot swallow it. */
@Controller('admin/whatsapp/leads')
@RequiresCapability('whatsapp:inbound:read')
export class WhatsAppLeadsController {
  constructor(
    private readonly inboundAdmin: WhatsAppInboundAdminService,
    private readonly intake: WhatsAppIntakeService,
    private readonly users: UsersService,
    private readonly presence: WaPresenceService,
    private readonly leadAlerts: WhatsAppLeadAlertService,
  ) {}

  @Post('presence')
  async presenceBeat(@Body() body: PresenceBody, @CurrentUser() user: AuthUser) {
    const actor = await this.users.getOrCreate(user);
    this.presence.beat(actor.id, body.available);
    return { available: body.available };
  }

  @Get('alerts')
  async alerts(@CurrentUser() user: AuthUser) {
    const actor = await this.users.getOrCreate(user);
    return { items: this.presence.list(actor.id) };
  }

  @Get('alert-status')
  alertStatus() {
    return this.leadAlerts.coverage();
  }

  @Get('roster')
  @RequiresAdminRole('superadmin')
  roster() {
    return this.leadAlerts.listRoster();
  }

  @Put('roster/:userId')
  @RequiresAdminRole('superadmin')
  saveRoster(@Param('userId') userId: string, @Body() body: RosterBody) {
    return this.leadAlerts.saveRoster(userId, body);
  }

  @Delete('roster/:userId')
  @RequiresAdminRole('superadmin')
  removeRoster(@Param('userId') userId: string) {
    return this.leadAlerts.removeRoster(userId);
  }

  @Post('translate')
  translate(@Body() body: TranslateAssistBody) {
    return this.intake.translateAssist(body.text, body.locale, body.direction ?? 'to_customer');
  }

  @Get()
  list(@Query() query: ListLeadsQuery) {
    return this.inboundAdmin.listLeads(query);
  }

  @Get('by-contact/:contactId')
  byContact(@Param('contactId') contactId: string) {
    return this.inboundAdmin.leadIdForCrmContact(contactId);
  }

  @Get(':id')
  one(@Param('id') id: string) {
    return this.inboundAdmin.getLead(id);
  }

  @Post(':id/assign')
  @RequiresCapability('whatsapp:inbound:reply')
  async assign(@Param('id') id: string, @Body() body: AssignBody, @CurrentUser() user: AuthUser) {
    const actor = await this.users.getOrCreate(user);
    return this.inboundAdmin.assignLead(id, body.ownerUserId ?? actor.id, actor.id);
  }

  @Post(':id/close')
  @RequiresCapability('whatsapp:inbound:reply')
  async close(@Param('id') id: string, @Body() body: CloseBody, @CurrentUser() user: AuthUser) {
    const actor = await this.users.getOrCreate(user);
    return this.inboundAdmin.closeLead(id, body.reason, actor.id);
  }

  @Post(':id/call')
  @RequiresCapability('whatsapp:inbound:reply')
  async decideCall(@Param('id') id: string, @Body() body: CallDecisionBody, @CurrentUser() user: AuthUser) {
    const actor = await this.users.getOrCreate(user);
    return this.inboundAdmin.decideCall(id, actor.id, body);
  }
}
