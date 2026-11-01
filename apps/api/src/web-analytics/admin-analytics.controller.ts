import { Body, Controller, Get, Param, Put, Query, Res } from '@nestjs/common';
import { IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { Response } from 'express';

import { RequiresAdminRole } from '../auth/admin-role.decorator';
import { RequiresCapability } from '../auth/capability.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { AdminAuditService } from '../authority/admin-audit.service';
import { UsersService } from '../users/users.service';
import { parseAnalyticsQuery } from './analytics-query';
import { AdminAnalyticsService } from './admin-analytics.service';

class SpendDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  utmCampaign!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(10)
  month!: string;

  @IsNumber()
  spendEur!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

@Controller('admin/analytics')
@RequiresCapability('admin')
@RequiresAdminRole('operations', 'marketing')
export class AdminAnalyticsController {
  constructor(
    private readonly analytics: AdminAnalyticsService,
    private readonly audit: AdminAuditService,
    private readonly users: UsersService,
  ) {}

  @Get('overview')
  overview(@Query('from') from?: string, @Query('to') to?: string, @Query('compare') compare?: string, @Query('locale') locale?: string, @Query('channel') channel?: string) {
    return this.analytics.overview(parseAnalyticsQuery({ from, to, compare, locale, channel }));
  }

  @Get('pages')
  pages(@Query('from') from?: string, @Query('to') to?: string, @Query('locale') locale?: string, @Query('channel') channel?: string) {
    return this.analytics.pages(parseAnalyticsQuery({ from, to, locale, channel }));
  }

  @Get('listings')
  listings(@Query('from') from?: string, @Query('to') to?: string, @Query('locale') locale?: string) {
    return this.analytics.listingsReport(parseAnalyticsQuery({ from, to, locale }));
  }

  @Get('sources')
  sources(@Query('from') from?: string, @Query('to') to?: string, @Query('compare') compare?: string, @Query('locale') locale?: string, @Query('channel') channel?: string) {
    return this.analytics.sources(parseAnalyticsQuery({ from, to, compare, locale, channel }));
  }

  @Get('conversions')
  conversions(@Query('from') from?: string, @Query('to') to?: string, @Query('locale') locale?: string, @Query('channel') channel?: string) {
    return this.analytics.conversions(parseAnalyticsQuery({ from, to, locale, channel }));
  }

  @Get('funnels/:id')
  funnels(@Param('id') id: string, @Query('from') from?: string, @Query('to') to?: string, @Query('channel') channel?: string) {
    return this.analytics.funnels(id, parseAnalyticsQuery({ from, to, channel }));
  }

  @Get('dimensions/:dim')
  dimensions(@Param('dim') dim: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.analytics.dimensions(dim, parseAnalyticsQuery({ from, to }));
  }

  @Get('provinces')
  provinces(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analytics.provinces(parseAnalyticsQuery({ from, to }));
  }

  @Get('realtime')
  realtime() {
    return this.analytics.realtime();
  }

  @Get('export.csv')
  async exportCsv(
    @Query('table') table: string,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Query('locale') locale: string | undefined,
    @Query('channel') channel: string | undefined,
    @Res() res: Response,
  ) {
    const csv = await this.analytics.exportCsv(table || 'pages', parseAnalyticsQuery({ from, to, locale, channel }));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="analytics-${table || 'pages'}.csv"`);
    res.send(csv);
  }

  @Put('spend')
  async spend(@CurrentUser() user: AuthUser, @Body() body: SpendDto) {
    const actor = await this.users.getOrCreate(user);
    const saved = await this.analytics.upsertSpend({
      utmCampaign: body.utmCampaign,
      month: body.month,
      spendEur: body.spendEur,
      note: body.note ?? null,
      updatedBy: actor.id,
    });
    await this.audit.record({
      actorUserId: actor.id,
      action: 'analytics.spend.upsert',
      resourceType: 'analytics_campaign_spend',
      resourceId: `${saved.utmCampaign}:${saved.month}`,
      reason: body.note ?? null,
    });
    return saved;
  }
}
