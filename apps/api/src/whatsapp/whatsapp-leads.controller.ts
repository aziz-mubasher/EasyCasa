import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { RequiresCapability } from '../auth/capability.decorator';
import { UsersService } from '../users/users.service';
import { WhatsAppInboundAdminService } from './whatsapp-inbound-admin.service';
import { WhatsAppIntakeService } from './whatsapp-intake.service';

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
  ) {}

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
