import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { ANALYTICS_FUNNELS, cleanUtm, type FunnelId } from '@easycasa/shared';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import {
  analyticsCampaignSpend,
  analyticsDailyConversions,
  analyticsDailyDims,
  analyticsDailyFunnels,
  analyticsDailyPages,
  analyticsDailyProvinces,
  analyticsDailySources,
  analyticsDailyTotals,
  analyticsServerConversions,
  listings,
} from '../db/schema';
import { comparisonWindow, monthStart, type AnalyticsQuery } from './analytics-query';

const DIMS = new Set(['device', 'browser', 'os', 'country', 'screen', 'locale', 'referrer']);

type Totals = {
  visitors: number;
  sessions: number;
  pageviews: number;
  engagedRate: number | null;
  avgEngagedMs: number | null;
  conversions: number;
  conversionRate: number | null;
};

@Injectable()
export class AdminAnalyticsService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async overview(q: AnalyticsQuery) {
    const current = await this.totals(q);
    const previousWindow = comparisonWindow(q);
    const previous = previousWindow ? await this.totals({ ...q, from: previousWindow.from, to: previousWindow.to }) : null;
    const daily = await this.daily(q);
    return { from: q.from, to: q.to, compare: q.compare, totals: current, previous, daily };
  }

  async realtime(): Promise<{ live: number }> {
    const since = new Date(Date.now() - 30 * 60 * 1000);
    const result = await this.db.execute<{ n: number }>(
      sql`SELECT count(DISTINCT visitor_hash)::int AS n FROM analytics_events WHERE ts > ${since}`,
    );
    const n = result.rows[0]?.n ?? 0;
    return { live: Number(n) };
  }

  async pages(q: AnalyticsQuery) {
    const rows = await this.db
      .select()
      .from(analyticsDailyPages)
      .where(and(gte(analyticsDailyPages.day, q.from), lte(analyticsDailyPages.day, q.to)));
    const grouped = new Map<string, {
      pathTemplate: string;
      locale: string | null;
      pageviews: number;
      visitors: number;
      entries: number;
      engagedMsSum: number;
      engagedSamples: number;
    }>();
    for (const row of rows) {
      if (q.locale && row.locale !== q.locale) continue;
      const key = `${row.pathTemplate}\u0000${row.locale ?? ''}`;
      const acc = grouped.get(key) ?? {
        pathTemplate: row.pathTemplate,
        locale: row.locale,
        pageviews: 0,
        visitors: 0,
        entries: 0,
        engagedMsSum: 0,
        engagedSamples: 0,
      };
      acc.pageviews += row.pageviews;
      acc.visitors += row.visitors;
      acc.entries += row.entries;
      acc.engagedMsSum += row.engagedMsSum;
      acc.engagedSamples += row.engagedSamples;
      grouped.set(key, acc);
    }
    return { rows: [...grouped.values()] };
  }

  async listingsReport(q: AnalyticsQuery) {
    const rows = await this.db
      .select()
      .from(analyticsDailyPages)
      .where(and(gte(analyticsDailyPages.day, q.from), lte(analyticsDailyPages.day, q.to)));
    const counts = new Map<string, number>();
    for (const row of rows) {
      if (row.pathTemplate !== '/listings/:id' || !row.entityId) continue;
      if (q.locale && row.locale !== q.locale) continue;
      counts.set(row.entityId, (counts.get(row.entityId) ?? 0) + row.pageviews);
    }
    const ids = [...counts.keys()];
    if (ids.length === 0) return { rows: [] };
    const meta = await this.db
      .select({ id: listings.id, title: listings.title, city: listings.city, province: listings.province })
      .from(listings)
      .where(sql`${listings.id} IN (${sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `)})`);
    const byId = new Map(meta.map((m) => [m.id, m]));
    return {
      rows: ids
        .map((id) => {
          const listing = byId.get(id);
          return {
            listingId: id,
            title: listing?.title ?? null,
            comune: listing?.city ?? null,
            provincia: listing?.province ?? null,
            pageviews: counts.get(id) ?? 0,
          };
        })
        .sort((a, b) => b.pageviews - a.pageviews),
    };
  }

  async sources(q: AnalyticsQuery) {
    const [sourceRows, conversionRows, spendRows] = await Promise.all([
      this.db
        .select()
        .from(analyticsDailySources)
        .where(and(gte(analyticsDailySources.day, q.from), lte(analyticsDailySources.day, q.to))),
      this.db
        .select()
        .from(analyticsDailyConversions)
        .where(and(gte(analyticsDailyConversions.day, q.from), lte(analyticsDailyConversions.day, q.to))),
      this.db
        .select()
        .from(analyticsCampaignSpend)
        .where(
          and(
            gte(analyticsCampaignSpend.month, monthStart(q.from)),
            lte(analyticsCampaignSpend.month, monthStart(q.to)),
          ),
        ),
    ]);
    const grouped = new Map<string, {
      channel: string;
      utmSource: string | null;
      utmMedium: string | null;
      utmCampaign: string | null;
      sessions: number;
      visitors: number;
      engagedSessions: number;
      pageviews: number;
      conversions: number;
    }>();
    for (const row of sourceRows) {
      if (q.locale && row.locale !== q.locale) continue;
      if (q.channel && row.channel !== q.channel) continue;
      const key = [row.channel, row.utmSource ?? '', row.utmMedium ?? '', row.utmCampaign ?? ''].join('\u0000');
      const acc = grouped.get(key) ?? {
        channel: row.channel,
        utmSource: row.utmSource,
        utmMedium: row.utmMedium,
        utmCampaign: row.utmCampaign,
        sessions: 0,
        visitors: 0,
        engagedSessions: 0,
        pageviews: 0,
        conversions: 0,
      };
      acc.sessions += row.sessions;
      acc.visitors += row.visitors;
      acc.engagedSessions += row.engagedSessions;
      acc.pageviews += row.pageviews;
      grouped.set(key, acc);
    }
    for (const row of conversionRows) {
      if (q.locale && row.locale !== q.locale) continue;
      if (q.channel && row.channel !== q.channel) continue;
      const key = [row.channel, '', '', row.utmCampaign ?? ''].join('\u0000');
      const match = [...grouped.values()].find(
        (g) => g.channel === row.channel && (g.utmCampaign ?? '') === (row.utmCampaign ?? ''),
      );
      if (match) match.conversions += row.count;
      else {
        const acc = grouped.get(key) ?? {
          channel: row.channel,
          utmSource: null,
          utmMedium: null,
          utmCampaign: row.utmCampaign,
          sessions: 0,
          visitors: 0,
          engagedSessions: 0,
          pageviews: 0,
          conversions: 0,
        };
        acc.conversions += row.count;
        grouped.set(key, acc);
      }
    }
    const spend = new Map<string, number>();
    for (const row of spendRows) {
      spend.set(row.utmCampaign, (spend.get(row.utmCampaign) ?? 0) + Number(row.spendEur));
    }
    return {
      rows: [...grouped.values()].map((row) => {
        const spendEur = row.utmCampaign ? spend.get(row.utmCampaign) ?? null : null;
        return {
          ...row,
          engagedRate: row.sessions ? row.engagedSessions / row.sessions : null,
          conversionRate: row.sessions ? row.conversions / row.sessions : null,
          spendEur,
          cpl: spendEur != null && row.conversions > 0 ? spendEur / row.conversions : null,
        };
      }),
      spend: spendRows.map((row) => ({
        utmCampaign: row.utmCampaign,
        month: row.month,
        spendEur: Number(row.spendEur),
        note: row.note,
      })),
    };
  }

  async conversions(q: AnalyticsQuery) {
    const [clientRows, serverRows] = await Promise.all([
      this.db
        .select()
        .from(analyticsDailyConversions)
        .where(and(gte(analyticsDailyConversions.day, q.from), lte(analyticsDailyConversions.day, q.to))),
      this.db
        .select()
        .from(analyticsServerConversions)
        .where(and(gte(analyticsServerConversions.day, q.from), lte(analyticsServerConversions.day, q.to))),
    ]);
    const client = new Map<string, number>();
    for (const row of clientRows) {
      if (q.locale && row.locale !== q.locale) continue;
      if (q.channel && row.channel !== q.channel) continue;
      client.set(row.eventName, (client.get(row.eventName) ?? 0) + row.count);
    }
    const server = new Map<string, number>();
    for (const row of serverRows) server.set(row.eventName, (server.get(row.eventName) ?? 0) + row.count);
    const names = new Set([...client.keys(), ...server.keys()]);
    return {
      rows: [...names].map((eventName) => {
        const clientCount = client.get(eventName) ?? 0;
        const serverCount = server.get(eventName) ?? 0;
        const gap = serverCount > 0 ? (serverCount - clientCount) / serverCount : null;
        return { eventName, client: clientCount, server: serverCount, gap };
      }),
    };
  }

  async funnels(id: string, q: AnalyticsQuery) {
    if (!(id in ANALYTICS_FUNNELS)) throw new BadRequestException('unknown funnel');
    const funnel = id as FunnelId;
    const rows = await this.db
      .select()
      .from(analyticsDailyFunnels)
      .where(
        and(
          gte(analyticsDailyFunnels.day, q.from),
          lte(analyticsDailyFunnels.day, q.to),
          eq(analyticsDailyFunnels.funnel, funnel),
        ),
      );
    const steps = new Map<number, number>();
    for (const row of rows) {
      if (q.channel && row.channel !== q.channel) continue;
      steps.set(row.step, (steps.get(row.step) ?? 0) + row.visitors);
    }
    const defined = ANALYTICS_FUNNELS[funnel].steps;
    const out = defined.map((step, index) => {
      const visitors = steps.get(step.step) ?? 0;
      const prev = index === 0 ? visitors : steps.get(defined[index - 1]!.step) ?? 0;
      const dropOff = index === 0 || prev === 0 ? null : (prev - visitors) / prev;
      return { step: step.step, label: step.label, visitors, dropOff };
    });
    return { funnel, steps: out };
  }

  async dimensions(dim: string, q: AnalyticsQuery) {
    if (!DIMS.has(dim)) throw new BadRequestException('unknown dimension');
    const rows = await this.db
      .select()
      .from(analyticsDailyDims)
      .where(
        and(
          gte(analyticsDailyDims.day, q.from),
          lte(analyticsDailyDims.day, q.to),
          eq(analyticsDailyDims.dim, dim),
        ),
      );
    const grouped = new Map<string, { value: string; visitors: number; sessions: number }>();
    for (const row of rows) {
      const acc = grouped.get(row.value) ?? { value: row.value, visitors: 0, sessions: 0 };
      acc.visitors += row.visitors;
      acc.sessions += row.sessions;
      grouped.set(row.value, acc);
    }
    return { dim, rows: [...grouped.values()] };
  }

  async provinces(q: AnalyticsQuery) {
    const rows = await this.db
      .select()
      .from(analyticsDailyProvinces)
      .where(and(gte(analyticsDailyProvinces.day, q.from), lte(analyticsDailyProvinces.day, q.to)));
    const grouped = new Map<string, { province: string; listingViews: number; enquiries: number }>();
    for (const row of rows) {
      const acc = grouped.get(row.province) ?? { province: row.province, listingViews: 0, enquiries: 0 };
      acc.listingViews += row.listingViews;
      acc.enquiries += row.enquiries;
      grouped.set(row.province, acc);
    }
    return { rows: [...grouped.values()] };
  }

  async upsertSpend(input: {
    utmCampaign: string;
    month: string;
    spendEur: number;
    note?: string | null;
    updatedBy: string;
  }) {
    const campaign = cleanUtm(input.utmCampaign);
    if (!campaign) throw new BadRequestException('invalid campaign');
    if (!/^\d{4}-\d{2}-01$/.test(input.month)) throw new BadRequestException('month must be YYYY-MM-01');
    if (!Number.isFinite(input.spendEur) || input.spendEur < 0 || input.spendEur > 1_000_000) {
      throw new BadRequestException('invalid spend');
    }
    const note = input.note?.trim().slice(0, 500) || null;
    await this.db
      .insert(analyticsCampaignSpend)
      .values({
        utmCampaign: campaign,
        month: input.month,
        spendEur: input.spendEur.toFixed(2),
        note,
        updatedBy: input.updatedBy,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [analyticsCampaignSpend.utmCampaign, analyticsCampaignSpend.month],
        set: {
          spendEur: input.spendEur.toFixed(2),
          note,
          updatedBy: input.updatedBy,
          updatedAt: new Date(),
        },
      });
    return { utmCampaign: campaign, month: input.month, spendEur: input.spendEur };
  }

  async exportCsv(table: string, q: AnalyticsQuery): Promise<string> {
    if (table === 'pages') return toCsv((await this.pages(q)).rows);
    if (table === 'sources') return toCsv((await this.sources(q)).rows);
    if (table === 'conversions') return toCsv((await this.conversions(q)).rows);
    if (table === 'provinces') return toCsv((await this.provinces(q)).rows);
    if (table === 'listings') return toCsv((await this.listingsReport(q)).rows);
    if (table === 'spend') return toCsv((await this.sources(q)).spend);
    if (table === 'funnels') {
      const blocks = [];
      for (const id of Object.keys(ANALYTICS_FUNNELS)) {
        const funnel = await this.funnels(id, q);
        blocks.push(...funnel.steps.map((step) => ({ funnel: funnel.funnel, ...step })));
      }
      return toCsv(blocks);
    }
    if (DIMS.has(table)) return toCsv((await this.dimensions(table, q)).rows);
    throw new BadRequestException('unknown table');
  }

  private async totals(q: AnalyticsQuery): Promise<Totals> {
    if (!q.locale && !q.channel) {
      const rows = await this.db
        .select()
        .from(analyticsDailyTotals)
        .where(and(gte(analyticsDailyTotals.day, q.from), lte(analyticsDailyTotals.day, q.to)));
      const acc = rows.reduce(
        (sum, row) => {
          sum.visitors += row.visitors;
          sum.sessions += row.sessions;
          sum.pageviews += row.pageviews;
          sum.engagedSessions += row.engagedSessions;
          sum.engagedMsSum += row.engagedMsSum;
          sum.engagedSamples += row.engagedSamples;
          sum.conversions += row.conversions;
          return sum;
        },
        { visitors: 0, sessions: 0, pageviews: 0, engagedSessions: 0, engagedMsSum: 0, engagedSamples: 0, conversions: 0 },
      );
      return shapeTotals(acc);
    }
    const sources = await this.sources(q);
    const sessions = sources.rows.reduce((n, r) => n + r.sessions, 0);
    const visitors = sources.rows.reduce((n, r) => n + r.visitors, 0);
    const pageviews = sources.rows.reduce((n, r) => n + r.pageviews, 0);
    const engagedSessions = sources.rows.reduce((n, r) => n + r.engagedSessions, 0);
    const conversions = sources.rows.reduce((n, r) => n + r.conversions, 0);
    return shapeTotals({
      visitors,
      sessions,
      pageviews,
      engagedSessions,
      engagedMsSum: 0,
      engagedSamples: 0,
      conversions,
    });
  }

  private async daily(q: AnalyticsQuery) {
    const rows = await this.db
      .select()
      .from(analyticsDailyTotals)
      .where(and(gte(analyticsDailyTotals.day, q.from), lte(analyticsDailyTotals.day, q.to)));
    return rows
      .map((row) => ({
        day: row.day,
        visitors: row.visitors,
        pageviews: row.pageviews,
        conversions: row.conversions,
      }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }
}

function shapeTotals(acc: {
  visitors: number;
  sessions: number;
  pageviews: number;
  engagedSessions: number;
  engagedMsSum: number;
  engagedSamples: number;
  conversions: number;
}): Totals {
  return {
    visitors: acc.visitors,
    sessions: acc.sessions,
    pageviews: acc.pageviews,
    engagedRate: acc.sessions ? acc.engagedSessions / acc.sessions : null,
    avgEngagedMs: acc.engagedSamples ? Math.round(acc.engagedMsSum / acc.engagedSamples) : null,
    conversions: acc.conversions,
    conversionRate: acc.sessions ? acc.conversions / acc.sessions : null,
  };
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]!);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvCell(row[h])).join(','));
  }
  return lines.join('\n');
}

function csvCell(value: unknown): string {
  if (value == null) return '';
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}
