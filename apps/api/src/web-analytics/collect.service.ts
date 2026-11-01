import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { isbot } from 'isbot';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  classifyChannel,
  cleanUtm,
  clickFlagFrom,
  countryFromTimeZone,
  isWebConversion,
  normalizePath,
  referrerHost,
  romeDay,
  sanitizeEventProps,
  screenBucket,
} from '@easycasa/shared';

import type { ApiConfig } from '../config';
import { APP_CONFIG } from '../config/config.module';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { analyticsEvents, analyticsSalts } from '../db/schema';
import { clientIp, throttleKey, truncateIp } from './ip';
import { allowCollect } from './rate-limit';
import { parseUa, primaryLanguage } from './ua';
import { visitorHash } from './visitor-hash';

const Payload = z.object({
  t: z.enum(['pageview', 'engage', 'event']),
  p: z.string().min(1).max(500),
  l: z.string().max(8).optional(),
  ref: z.string().max(500).optional(),
  utm: z
    .object({
      source: z.string().max(200).optional(),
      medium: z.string().max(200).optional(),
      campaign: z.string().max(200).optional(),
      content: z.string().max(200).optional(),
      term: z.string().max(200).optional(),
    })
    .optional(),
  gclid: z.union([z.boolean(), z.string().max(300)]).optional(),
  gbraid: z.union([z.boolean(), z.string().max(300)]).optional(),
  wbraid: z.union([z.boolean(), z.string().max(300)]).optional(),
  fbclid: z.union([z.boolean(), z.string().max(300)]).optional(),
  ttclid: z.union([z.boolean(), z.string().max(300)]).optional(),
  msclkid: z.union([z.boolean(), z.string().max(300)]).optional(),
  tz: z.string().max(64).optional(),
  sw: z.number().optional(),
  e: z.string().max(80).optional(),
  props: z.record(z.unknown()).optional(),
  engagedMs: z.number().int().optional(),
  scrollPct: z.number().int().optional(),
});

type Headers = Record<string, string | string[] | undefined>;

export type CollectRequest = {
  headers: Headers;
  socketIp?: string;
  body?: unknown;
  collectRaw?: string;
};

const SCROLL = new Set([0, 25, 50, 75, 100]);

@Injectable()
export class CollectService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: ApiConfig,
  ) {}

  async ingest(req: CollectRequest): Promise<void> {
    if (!this.config.WEB_ANALYTICS_ENABLED) return;

    const ua = header(req.headers, 'user-agent') ?? '';
    const ip = clientIp(req.headers, req.socketIp);
    if (!allowCollect(throttleKey(ip))) return;

    if (!ua || isbot(ua)) return;
    if (this.config.ANALYTICS_HONOR_GPC) {
      const gpc = header(req.headers, 'sec-gpc');
      const dnt = header(req.headers, 'dnt');
      if (gpc === '1' || dnt === '1') return;
    }
    const origin = header(req.headers, 'origin');
    if (!origin || !this.allowedOrigin(origin)) return;
    if (staffOptOut(header(req.headers, 'cookie'))) return;

    const payload = this.parse(req);
    if (!payload) return;

    const normalized = normalizePath(payload.p);
    if (payload.t === 'event' && !isWebConversion(payload.e)) return;

    const parsed = parseUa(ua);
    const trunc = ip ? truncateIp(ip) : '0.0.0.0';
    const day = romeDay();
    const salt = await this.saltFor(day);
    const hash = visitorHash({
      salt,
      site: this.config.WEB_ANALYTICS_SITE,
      truncIp: trunc,
      familyMajor: parsed.familyMajor,
      lang: primaryLanguage(header(req.headers, 'accept-language')),
    });

    const utmSource = cleanUtm(payload.utm?.source);
    const utmMedium = cleanUtm(payload.utm?.medium);
    const utmCampaign = cleanUtm(payload.utm?.campaign);
    const utmContent = cleanUtm(payload.utm?.content);
    const utmTerm = cleanUtm(payload.utm?.term);
    const clickFlag = clickFlagFrom(payload);
    const refHost = referrerHost(payload.ref, this.siteHost());
    const channel = classifyChannel({
      clickFlag,
      utmMedium,
      utmSource,
      referrerHost: refHost,
    });
    const props = payload.t === 'event' ? sanitizeEventProps(payload.props) : null;
    const engagedMs =
      payload.t === 'engage' &&
      payload.engagedMs != null &&
      payload.engagedMs >= 0 &&
      payload.engagedMs <= 1_800_000
        ? payload.engagedMs
        : null;
    const scrollPct =
      payload.t === 'engage' && payload.scrollPct != null && SCROLL.has(payload.scrollPct)
        ? payload.scrollPct
        : null;
    const entityId = normalized.template === '/listings/:id' ? normalized.entityId : null;

    await this.db.insert(analyticsEvents).values({
      day,
      visitorHash: hash,
      type: payload.t,
      pathTemplate: normalized.template,
      entityId,
      locale: normalized.locale,
      referrerHost: refHost,
      channel,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      clickFlag,
      device: parsed.device,
      browser: parsed.browser,
      os: parsed.os,
      country: countryFromTimeZone(payload.tz),
      screenBucket: screenBucket(payload.sw),
      eventName: payload.t === 'event' ? payload.e ?? null : null,
      eventProps: props,
      engagedMs,
      scrollPct,
    });
  }

  private parse(req: CollectRequest): z.infer<typeof Payload> | null {
    let raw: unknown = req.body;
    if (typeof req.collectRaw === 'string' && req.collectRaw.length > 0) {
      try {
        raw = JSON.parse(req.collectRaw);
      } catch {
        return null;
      }
    }
    const parsed = Payload.safeParse(raw);
    return parsed.success ? parsed.data : null;
  }

  private allowedOrigin(origin: string): boolean {
    const allowed = this.config.WEB_ANALYTICS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
    return allowed.includes(origin);
  }

  private siteHost(): string {
    try {
      return new URL(this.config.WEB_ANALYTICS_SITE.includes('://')
        ? this.config.WEB_ANALYTICS_SITE
        : `https://${this.config.WEB_ANALYTICS_SITE}`).hostname;
    } catch {
      return 'easycasaita.com';
    }
  }

  private async saltFor(day: string): Promise<Buffer> {
    const salt = randomBytes(32);
    await this.db.insert(analyticsSalts).values({ day, salt }).onConflictDoNothing();
    const rows = await this.db.select({ salt: analyticsSalts.salt }).from(analyticsSalts).where(eq(analyticsSalts.day, day)).limit(1);
    const stored = rows[0]?.salt;
    if (!stored) throw new Error('salt missing');
    return Buffer.isBuffer(stored) ? stored : Buffer.from(stored);
  }
}

function header(headers: Headers, name: string): string | undefined {
  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0];
  return value;
}

function staffOptOut(cookie: string | undefined): boolean {
  if (!cookie) return false;
  return cookie.split(';').some((part) => part.trim() === 'ec_staff=1');
}
