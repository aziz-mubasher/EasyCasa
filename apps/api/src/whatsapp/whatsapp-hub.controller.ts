import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

import { RequiresCapability } from '../auth/capability.decorator';
import { WhatsAppHubService } from './whatsapp-hub.service';

class CannedBody {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  body!: string;

  @IsOptional()
  @IsIn(['it', 'en', 'es', 'ur', 'hi'])
  locale?: string;
}

class AnalyticsQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;
}

/**
 * K EC 7.4 — API Hub tabs. Same capability as the inbox.
 */
@Controller('admin/whatsapp/hub')
@RequiresCapability('whatsapp:inbound:read')
export class WhatsAppHubController {
  constructor(private readonly hub: WhatsAppHubService) {}

  @Get('connection')
  connection() {
    return this.hub.connectionStatus();
  }

  @Get('templates')
  templates() {
    return this.hub.templatesCatalog();
  }

  @Get('analytics')
  analytics(@Query() query: AnalyticsQuery) {
    return this.hub.analytics(query.days ?? 90);
  }

  @Get('canned')
  canned() {
    return this.hub.listCanned();
  }

  @Post('canned')
  @RequiresCapability('whatsapp:inbound:reply')
  createCanned(@Body() body: CannedBody) {
    return this.hub.createCanned(body);
  }

  @Delete('canned/:id')
  @RequiresCapability('whatsapp:inbound:reply')
  async deleteCanned(@Param('id') id: string) {
    const ok = await this.hub.deleteCanned(id);
    if (!ok) throw new NotFoundException('canned reply not found');
    return { deleted: true };
  }
}
