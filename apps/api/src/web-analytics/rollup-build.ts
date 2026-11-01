import {
  ANALYTICS_FUNNELS,
  funnelStepsReached,
  isWebConversion,
  type FunnelId,
} from '@easycasa/shared';

const SESSION_GAP_MS = 30 * 60 * 1000;
const ENGAGED_MS = 10_000;
const FUNNELS = Object.keys(ANALYTICS_FUNNELS) as FunnelId[];

export type RollupInputEvent = {
  ts: number;
  visitorHash: string;
  type: 'pageview' | 'engage' | 'event';
  pathTemplate: string;
  entityId: string | null;
  locale: string | null;
  referrerHost: string | null;
  channel: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  screenBucket: string | null;
  eventName: string | null;
  engagedMs: number | null;
  provincia: string | null;
};

export type PageRow = {
  pathTemplate: string;
  locale: string | null;
  entityId: string | null;
  pageviews: number;
  visitors: number;
  entries: number;
  engagedMsSum: number;
  engagedSamples: number;
};

export type SourceRow = {
  channel: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  locale: string | null;
  sessions: number;
  visitors: number;
  engagedSessions: number;
  pageviews: number;
};

export type ConversionRow = {
  eventName: string;
  channel: string;
  utmCampaign: string | null;
  locale: string | null;
  count: number;
};

export type DimRow = { dim: string; value: string; visitors: number; sessions: number };
export type FunnelRow = { funnel: string; step: number; channel: string; visitors: number };
export type ProvinceRow = { province: string; listingViews: number; enquiries: number };

export type RollupBuild = {
  pages: PageRow[];
  sources: SourceRow[];
  conversions: ConversionRow[];
  dims: DimRow[];
  funnels: FunnelRow[];
  provinces: ProvinceRow[];
  totals: {
    visitors: number;
    sessions: number;
    pageviews: number;
    engagedSessions: number;
    engagedMsSum: number;
    engagedSamples: number;
    conversions: number;
  };
  listingViewCounts: { entityId: string; count: number }[];
};

type Session = {
  visitorHash: string;
  startTs: number;
  channel: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  locale: string | null;
  referrerHost: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  screenBucket: string | null;
  pageviews: number;
  engaged: boolean;
  events: RollupInputEvent[];
  sawPageview: boolean;
};

function keyOf(parts: (string | null)[]): string {
  return parts.map((p) => p ?? '\u0000').join('\u0001');
}

export function buildRollup(
  events: RollupInputEvent[],
  provinceByListing: ReadonlyMap<string, string>,
): RollupBuild {
  const byVisitor = new Map<string, RollupInputEvent[]>();
  for (const event of events) {
    const list = byVisitor.get(event.visitorHash) ?? [];
    list.push(event);
    byVisitor.set(event.visitorHash, list);
  }

  const sessions: Session[] = [];
  const firstChannel = new Map<string, string>();

  for (const [visitorHash, list] of byVisitor) {
    list.sort((a, b) => a.ts - b.ts);
    let current: Session | null = null;
    for (const event of list) {
      const prev = current?.events[current.events.length - 1];
      if (!current || (prev && event.ts - prev.ts > SESSION_GAP_MS)) {
        current = {
          visitorHash,
          startTs: event.ts,
          channel: event.channel,
          utmSource: event.utmSource,
          utmMedium: event.utmMedium,
          utmCampaign: event.utmCampaign,
          locale: event.locale,
          referrerHost: event.referrerHost,
          device: event.device,
          browser: event.browser,
          os: event.os,
          country: event.country,
          screenBucket: event.screenBucket,
          pageviews: 0,
          engaged: false,
          events: [],
          sawPageview: false,
        };
        sessions.push(current);
        if (!firstChannel.has(visitorHash)) firstChannel.set(visitorHash, event.channel);
      }
      current.events.push(event);
      if (event.type === 'pageview') current.pageviews += 1;
    }
  }

  for (const session of sessions) {
    const conversion = session.events.some(
      (e) => e.type === 'event' && e.eventName != null && isWebConversion(e.eventName),
    );
    const long = session.events.some((e) => (e.engagedMs ?? 0) >= ENGAGED_MS);
    session.engaged = conversion || long || session.pageviews >= 2;
  }

  const pages = new Map<string, PageRow & { hashes: Set<string> }>();
  const sources = new Map<string, SourceRow & { hashes: Set<string> }>();
  const conversions = new Map<string, ConversionRow>();
  const dims = new Map<string, DimRow & { hashes: Set<string> }>();
  const funnels = new Map<string, FunnelRow>();
  const provinces = new Map<string, ProvinceRow>();
  const listingViews = new Map<string, number>();

  let pageviews = 0;
  let engagedMsSum = 0;
  let engagedSamples = 0;
  let conversionCount = 0;

  const bumpPage = (event: RollupInputEvent, entry: boolean, hash: string) => {
    const k = keyOf([event.pathTemplate, event.locale, event.entityId]);
    const row = pages.get(k) ?? {
      pathTemplate: event.pathTemplate,
      locale: event.locale,
      entityId: event.entityId,
      pageviews: 0,
      visitors: 0,
      entries: 0,
      engagedMsSum: 0,
      engagedSamples: 0,
      hashes: new Set<string>(),
    };
    row.pageviews += 1;
    if (entry) row.entries += 1;
    row.hashes.add(hash);
    pages.set(k, row);
  };

  for (const session of sessions) {
    const sk = keyOf([
      session.channel,
      session.utmSource,
      session.utmMedium,
      session.utmCampaign,
      session.locale,
    ]);
    const source = sources.get(sk) ?? {
      channel: session.channel,
      utmSource: session.utmSource,
      utmMedium: session.utmMedium,
      utmCampaign: session.utmCampaign,
      locale: session.locale,
      sessions: 0,
      visitors: 0,
      engagedSessions: 0,
      pageviews: 0,
      hashes: new Set<string>(),
    };
    source.sessions += 1;
    source.pageviews += session.pageviews;
    if (session.engaged) source.engagedSessions += 1;
    source.hashes.add(session.visitorHash);
    sources.set(sk, source);

    const dimPairs: [string, string | null][] = [
      ['device', session.device],
      ['browser', session.browser],
      ['os', session.os],
      ['country', session.country],
      ['screen', session.screenBucket],
      ['locale', session.locale],
      ['referrer', session.referrerHost],
    ];
    for (const [dim, value] of dimPairs) {
      const v = value && value.trim() ? value : '(none)';
      const dk = keyOf([dim, v]);
      const row = dims.get(dk) ?? { dim, value: v, visitors: 0, sessions: 0, hashes: new Set<string>() };
      row.sessions += 1;
      row.hashes.add(session.visitorHash);
      dims.set(dk, row);
    }

    for (const event of session.events) {
      if (event.type === 'pageview') {
        pageviews += 1;
        const entry = !session.sawPageview;
        session.sawPageview = true;
        bumpPage(event, entry, session.visitorHash);
        if (event.pathTemplate === '/listings/:id' && event.entityId) {
          const province = provinceByListing.get(event.entityId) ?? '(unknown)';
          const row = provinces.get(province) ?? { province, listingViews: 0, enquiries: 0 };
          row.listingViews += 1;
          provinces.set(province, row);
        }
      }
      if (event.type === 'engage' && event.engagedMs != null) {
        engagedMsSum += event.engagedMs;
        engagedSamples += 1;
        const k = keyOf([event.pathTemplate, event.locale, event.entityId]);
        const row = pages.get(k) ?? {
          pathTemplate: event.pathTemplate,
          locale: event.locale,
          entityId: event.entityId,
          pageviews: 0,
          visitors: 0,
          entries: 0,
          engagedMsSum: 0,
          engagedSamples: 0,
          hashes: new Set<string>(),
        };
        row.engagedMsSum += event.engagedMs;
        row.engagedSamples += 1;
        row.hashes.add(session.visitorHash);
        pages.set(k, row);
      }
      if (event.type === 'event' && event.eventName && isWebConversion(event.eventName)) {
        conversionCount += 1;
        const ck = keyOf([event.eventName, session.channel, session.utmCampaign, event.locale ?? session.locale]);
        const row = conversions.get(ck) ?? {
          eventName: event.eventName,
          channel: session.channel,
          utmCampaign: session.utmCampaign,
          locale: event.locale ?? session.locale,
          count: 0,
        };
        row.count += 1;
        conversions.set(ck, row);
        if (event.eventName === 'listing.view' && event.entityId) {
          listingViews.set(event.entityId, (listingViews.get(event.entityId) ?? 0) + 1);
        }
        if (event.eventName === 'enquiry.submitted') {
          const province = event.provincia ?? '(unknown)';
          const prow = provinces.get(province) ?? { province, listingViews: 0, enquiries: 0 };
          prow.enquiries += 1;
          provinces.set(province, prow);
        }
      }
    }
  }

  for (const [visitorHash, list] of byVisitor) {
    const channel = firstChannel.get(visitorHash) ?? 'Direct';
    const signals = list.map((e) => ({
      ts: e.ts,
      type: e.type,
      pathTemplate: e.pathTemplate,
      eventName: e.eventName,
    }));
    for (const funnel of FUNNELS) {
      for (const step of funnelStepsReached(funnel, signals)) {
        const fk = keyOf([funnel, String(step), channel]);
        const row = funnels.get(fk) ?? { funnel, step, channel, visitors: 0 };
        row.visitors += 1;
        funnels.set(fk, row);
      }
    }
  }

  const engagedSessions = sessions.filter((s) => s.engaged).length;

  return {
    pages: [...pages.values()].map(({ hashes, ...row }) => ({ ...row, visitors: hashes.size })),
    sources: [...sources.values()].map(({ hashes, ...row }) => ({ ...row, visitors: hashes.size })),
    conversions: [...conversions.values()],
    dims: [...dims.values()].map(({ hashes, ...row }) => ({ ...row, visitors: hashes.size })),
    funnels: [...funnels.values()],
    provinces: [...provinces.values()],
    totals: {
      visitors: byVisitor.size,
      sessions: sessions.length,
      pageviews,
      engagedSessions,
      engagedMsSum,
      engagedSamples,
      conversions: conversionCount,
    },
    listingViewCounts: [...listingViews.entries()].map(([entityId, count]) => ({ entityId, count })),
  };
}
