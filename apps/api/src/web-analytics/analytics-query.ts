import { BadRequestException } from '@nestjs/common';
import { ANALYTICS_CHANNELS, addDays, romeDay, type AnalyticsChannel } from '@easycasa/shared';

export type AnalyticsQuery = {
  from: string;
  to: string;
  compare: 'prev' | 'yoy' | 'none';
  locale?: 'it' | 'en' | 'es';
  channel?: AnalyticsChannel;
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function parseAnalyticsQuery(
  q: { from?: string; to?: string; compare?: string; locale?: string; channel?: string },
  now = new Date(),
): AnalyticsQuery {
  const to = q.to && DAY.test(q.to) ? q.to : romeDay(now);
  const from = q.from && DAY.test(q.from) ? q.from : addDays(to, -27);
  if (!DAY.test(from) || !DAY.test(to)) throw new BadRequestException('invalid date');
  if (from > to) throw new BadRequestException('from after to');
  const span = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
  if (span > 400) throw new BadRequestException('range exceeds 400 days');
  const compare = q.compare === 'prev' || q.compare === 'yoy' ? q.compare : 'none';
  const locale = q.locale === 'it' || q.locale === 'en' || q.locale === 'es' ? q.locale : undefined;
  const channel = ANALYTICS_CHANNELS.find((c) => c === q.channel);
  return { from, to, compare, locale, channel };
}

export function comparisonWindow(q: AnalyticsQuery): { from: string; to: string } | null {
  if (q.compare === 'none') return null;
  if (q.compare === 'yoy') {
    return { from: shiftYear(q.from, -1), to: shiftYear(q.to, -1) };
  }
  const span = Math.round((Date.parse(`${q.to}T00:00:00Z`) - Date.parse(`${q.from}T00:00:00Z`)) / 86_400_000) + 1;
  const to = addDays(q.from, -1);
  return { from: addDays(to, -(span - 1)), to };
}

function shiftYear(day: string, delta: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(Date.UTC(y! + delta, (m ?? 1) - 1, d ?? 1));
  return dt.toISOString().slice(0, 10);
}

export function monthStart(day: string): string {
  return `${day.slice(0, 7)}-01`;
}
