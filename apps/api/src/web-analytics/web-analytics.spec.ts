import { readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { classifyChannel, cleanUtm, normalizePath, samplePathForPageFile } from '@easycasa/shared';

import { CapabilityGuard } from '../auth/capability.guard';
import { ADMIN_ROLES_KEY } from '../auth/admin-role.decorator';
import { CAPABILITIES_KEY } from '../auth/capability.decorator';
import { IS_PUBLIC } from '../auth/public.decorator';
import type { ApiConfig } from '../config';
import { CollectService } from './collect.service';
import { buildRollup, type RollupInputEvent } from './rollup-build';
import { visitorHash } from './visitor-hash';

const SQL = readFileSync(join(__dirname, '../../../../migration/sql/0076_ec_web_analytics.sql'), 'utf8');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

describe('normalizePath', () => {
  it('redacts share tokens, analysis ids and payment paths', () => {
    expect(normalizePath('/it/s/secret-token')).toEqual({ template: '/s/:token', locale: 'it', entityId: null });
    expect(normalizePath('/it/aste/analisi/11111111-1111-4111-8111-111111111111')).toMatchObject({
      template: '/aste/analisi/:id',
      entityId: null,
    });
    expect(normalizePath('/it/aste/report/abc')).toMatchObject({ template: '/aste/report/:id', entityId: null });
    expect(normalizePath('/it/pagamento/successo')).toMatchObject({ entityId: null });
    expect(normalizePath('/it/pagamento/checkout/sess_secret')).toMatchObject({
      template: '/pagamento/:other',
      entityId: null,
    });
    const id = '11111111-1111-4111-8111-111111111111';
    expect(normalizePath(`/en/listings/${id}`)).toEqual({
      template: '/listings/:id',
      locale: 'en',
      entityId: id,
    });
    expect(normalizePath('/it/listings/not-a-uuid').entityId).toBeNull();
    expect(normalizePath('/it/unknown-page').template).toBe('/:other');
    expect(normalizePath('/it').template).toBe('/');
  });

  it('fails when a page folder has no template', () => {
    const root = join(__dirname, '../../../web/app');
    const gaps: string[] = [];
    for (const file of walk(root)) {
      if (!file.endsWith('/page.tsx') && !file.endsWith('/page.ts')) continue;
      const rel = file.slice(root.length + 1);
      const sample = samplePathForPageFile(`app/${rel}`);
      if (!sample) continue;
      const got = normalizePath(sample.pathname);
      if (got.template !== sample.template) gaps.push(`${rel} -> ${got.template} != ${sample.template}`);
    }
    expect(gaps, gaps.join('\n')).toEqual([]);
  });
});

describe('classifyChannel', () => {
  it('covers each rule in order', () => {
    expect(classifyChannel({ clickFlag: 'google_ads' })).toBe('Paid Search');
    expect(classifyChannel({ clickFlag: 'bing' })).toBe('Paid Search');
    expect(classifyChannel({ clickFlag: 'meta' })).toBe('Paid Social');
    expect(classifyChannel({ clickFlag: 'tiktok' })).toBe('Paid Social');
    expect(classifyChannel({ utmMedium: 'cpc' })).toBe('Paid Search');
    expect(classifyChannel({ utmMedium: 'paid_social' })).toBe('Paid Social');
    expect(classifyChannel({ utmMedium: 'email' })).toBe('Email');
    expect(classifyChannel({ utmMedium: 'whatsapp' })).toBe('WhatsApp');
    expect(classifyChannel({ utmSource: 'whatsapp' })).toBe('WhatsApp');
    expect(classifyChannel({ utmMedium: 'partner' })).toBe('Partner');
    expect(classifyChannel({ utmMedium: 'qr' })).toBe('Offline');
    expect(classifyChannel({ referrerHost: 'www.google.it' })).toBe('Organic Search');
    expect(classifyChannel({ referrerHost: 'gemini.google.com' })).toBe('AI Assistants');
    expect(classifyChannel({ referrerHost: 'l.facebook.com' })).toBe('Organic Social');
    expect(classifyChannel({ referrerHost: 'www.immobiliare.it' })).toBe('Portals');
    expect(classifyChannel({ referrerHost: 'example.com' })).toBe('Referral');
    expect(classifyChannel({})).toBe('Direct');
  });
});

describe('UTM cleaning', () => {
  it('rejects @ and long digit runs', () => {
    expect(cleanUtm('ada@example.com')).toBeNull();
    expect(cleanUtm('call3331234567')).toBeNull();
    expect(cleanUtm('  Meta ')).toBe('meta');
  });
});

describe('visitor hash', () => {
  it('is stable for one salt and changes when the salt changes', () => {
    const input = {
      site: 'easycasaita.com',
      truncIp: '203.0.113.0',
      familyMajor: 'chrome/120',
      lang: 'it',
    };
    const day = Buffer.alloc(32, 1);
    const next = Buffer.alloc(32, 2);
    expect(visitorHash({ ...input, salt: day })).toBe(visitorHash({ ...input, salt: day }));
    expect(visitorHash({ ...input, salt: day })).not.toBe(visitorHash({ ...input, salt: next }));
    expect(visitorHash({ ...input, salt: day })).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('schema guard', () => {
  it('analytics tables do not store ip, user, email, phone or ua, and rollups have no hash', () => {
    const tables = [...SQL.matchAll(/CREATE TABLE (analytics_\w+) \(([\s\S]*?)\);/g)];
    expect(tables.length).toBeGreaterThan(5);
    const banned = /(^|_)(ip|user|email|phone|ua)($|_)|\bip\b|\buser_|\bemail\b|\bphone\b|\bua\b/i;
    for (const match of tables) {
      const name = match[1]!;
      const body = match[2]!;
      const columns = body
        .split('\n')
        .map((line) => line.trim().split(/\s+/)[0]?.replace(/"/g, '') ?? '')
        .filter((col) => col && !col.startsWith('--') && !col.startsWith('PRIMARY') && !col.startsWith('CHECK') && !col.startsWith('CONSTRAINT'));
      for (const col of columns) {
        expect(col.toLowerCase(), `${name}.${col}`).not.toMatch(banned);
      }
      if (name !== 'analytics_events' && name !== 'analytics_salts') {
        expect(body).not.toContain('visitor_hash');
      }
    }
  });
});

function mockDb() {
  const events: unknown[] = [];
  const salt = Buffer.alloc(32, 9);
  const db = {
    insert: () => ({
      values: (row: unknown) => {
        const api = {
          onConflictDoNothing: async () => undefined,
          then: (resolve: (value: unknown) => void) => {
            events.push(row);
            return Promise.resolve(resolve(undefined));
          },
        };
        return api;
      },
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ salt }],
        }),
      }),
    }),
  };
  return { db, events };
}

function config(enabled = true): ApiConfig {
  return {
    WEB_ANALYTICS_ENABLED: enabled,
    ANALYTICS_HONOR_GPC: true,
    WEB_ANALYTICS_SITE: 'easycasaita.com',
    WEB_ANALYTICS_ORIGINS: 'https://easycasaita.com',
  } as ApiConfig;
}

const HUMAN =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

describe('collector drops', () => {
  const logs: string[] = [];

  it('stores nothing for flag, bot, GPC, DNT and staff, and logs no address', async () => {
    const push = (msg: unknown) => {
      logs.push(String(msg));
    };
    vi.spyOn(Logger.prototype, 'log').mockImplementation(push);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(push);
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(push);
    const info = vi.spyOn(console, 'info').mockImplementation((...args) => {
      logs.push(args.map(String).join(' '));
    });
    const log = vi.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.map(String).join(' '));
    });

    const ip = '203.0.113.45';
    const base = {
      headers: {
        'user-agent': HUMAN,
        origin: 'https://easycasaita.com',
        'x-forwarded-for': `1.2.3.4, ${ip}`,
        'accept-language': 'it-IT,it;q=0.9',
      },
      body: { t: 'pageview', p: '/it/search', sw: 1280, tz: 'Europe/Rome' },
    };

    const off = mockDb();
    await new CollectService(off.db as never, config(false)).ingest(base);
    expect(off.events).toHaveLength(0);

    const bot = mockDb();
    await new CollectService(bot.db as never, config()).ingest({
      ...base,
      headers: { ...base.headers, 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
    });
    expect(bot.events).toHaveLength(0);

    const gpc = mockDb();
    await new CollectService(gpc.db as never, config()).ingest({
      ...base,
      headers: { ...base.headers, 'sec-gpc': '1' },
    });
    expect(gpc.events).toHaveLength(0);

    const dnt = mockDb();
    await new CollectService(dnt.db as never, config()).ingest({
      ...base,
      headers: { ...base.headers, dnt: '1' },
    });
    expect(dnt.events).toHaveLength(0);

    const staff = mockDb();
    await new CollectService(staff.db as never, config()).ingest({
      ...base,
      headers: { ...base.headers, cookie: 'ec_staff=1' },
    });
    expect(staff.events).toHaveLength(0);

    const ok = mockDb();
    await new CollectService(ok.db as never, config()).ingest(base);
    expect(ok.events).toHaveLength(1);

    const blob = logs.join('\n');
    expect(blob).not.toMatch(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    expect(blob).not.toMatch(/\b[0-9a-f]{0,4}:[0-9a-f:]+\b/i);
    info.mockRestore();
    log.mockRestore();
  });
});

describe('rollup', () => {
  it('attributes a same-day session and a buyer funnel', () => {
    const base = {
      visitorHash: 'a'.repeat(32),
      locale: 'it',
      referrerHost: null,
      channel: 'Paid Search',
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'ec_test_bs_smoke_202611',
      device: 'desktop',
      browser: 'chrome',
      os: 'windows',
      country: 'IT',
      screenBucket: '>1024',
      engagedMs: null,
      provincia: 'BS',
    } satisfies Omit<RollupInputEvent, 'ts' | 'type' | 'pathTemplate' | 'entityId' | 'eventName'>;
    const events: RollupInputEvent[] = [
      { ...base, ts: 1_000, type: 'pageview', pathTemplate: '/search', entityId: null, eventName: null },
      { ...base, ts: 2_000, type: 'event', pathTemplate: '/listings/:id', entityId: null, eventName: 'listing.view' },
      { ...base, ts: 3_000, type: 'event', pathTemplate: '/listings/:id', entityId: null, eventName: 'enquiry.submitted' },
    ];
    const rollup = buildRollup(events, new Map());
    expect(rollup.totals.visitors).toBe(1);
    expect(rollup.totals.sessions).toBe(1);
    expect(rollup.totals.pageviews).toBe(1);
    expect(rollup.sources[0]?.channel).toBe('Paid Search');
    expect(rollup.sources[0]?.utmCampaign).toBe('ec_test_bs_smoke_202611');
    const buyer = rollup.funnels.filter((row) => row.funnel === 'buyer').map((row) => row.step);
    expect(buyer).toEqual([1, 2, 3]);
  });
});

describe('admin analytics roles', () => {
  const reflector = {
    getAllAndOverride(key: string) {
      if (key === IS_PUBLIC) return false;
      if (key === CAPABILITIES_KEY) return ['admin'];
      if (key === ADMIN_ROLES_KEY) return ['operations', 'marketing'];
      return undefined;
    },
  };
  const guard = new CapabilityGuard(reflector as never);

  function ctx(roles: string[]) {
    return {
      getHandler: () => function handler() {},
      getClass: () => class AnalyticsController {},
      switchToHttp: () => ({
        getRequest: () => ({ user: { roles, capabilities: ['admin'] } }),
      }),
    } as never;
  }

  it('allows marketing and operations and refuses support, finance, dpo and aml', () => {
    expect(guard.canActivate(ctx(['admin_marketing']))).toBe(true);
    expect(guard.canActivate(ctx(['admin_operations']))).toBe(true);
    expect(guard.canActivate(ctx(['admin_superadmin']))).toBe(true);
    for (const role of ['admin_support', 'admin_finance', 'admin_dpo', 'admin_aml']) {
      expect(() => guard.canActivate(ctx([role]))).toThrow(/insufficient admin role/);
    }
  });
});

describe('beacon size', () => {
  it('gzips under 2 KB', () => {
    const source = readFileSync(join(__dirname, '../../../web/src/lib/analytics/beacon.ts'));
    expect(gzipSync(source).length).toBeLessThanOrEqual(2048);
  });
});
