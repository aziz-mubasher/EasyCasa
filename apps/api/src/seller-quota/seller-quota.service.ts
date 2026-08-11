import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { and, count, eq, sql } from 'drizzle-orm';
import {
  DEFAULT_QUOTA,
  entitlementsFor,
  evaluateListingQuota,
  evaluateUploadQuota,
  localDayKey,
  quotaConfigFor,
  resolveTier,
  type QuotaConfig,
  type SellerSubscription,
  type SubscriptionStatus,
} from '@easycasa/shared';

import { APP_CONFIG } from '../config/config.module';
import type { ApiConfig } from '../config/load';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { listings, media, sellerSubscription } from '../db/schema';
import type { AuthUser } from '../auth/auth.types';

const QUOTA_MESSAGES = {
  uploadsPerDay: {
    it: 'Hai raggiunto il limite di caricamenti per oggi. Riprova dopo la mezzanotte (ora di Roma).',
    en: 'You have reached today’s upload limit. Try again after midnight (Rome time).',
    es: 'Has alcanzado el límite de subidas de hoy. Inténtalo de nuevo después de medianoche (hora de Roma).',
  },
  activeListings: {
    it: 'Hai raggiunto il numero massimo di annunci attivi.',
    en: 'You have reached the maximum number of active listings.',
    es: 'Has alcanzado el número máximo de anuncios activos.',
  },
} as const;

export type QuotaLocale = 'it' | 'en' | 'es';

let softConfigLogged = false;

/** Soft-read env-backed ints: invalid/missing → defaults (T10 lesson — no boot-throw). */
export function resolveQuotaConfig(config: ApiConfig, log?: Logger): QuotaConfig {
  const maxActive = softPositiveInt(
    config.SELLER_MAX_ACTIVE_LISTINGS,
    DEFAULT_QUOTA.maxActiveListings,
    'SELLER_MAX_ACTIVE_LISTINGS',
    log,
  );
  const maxUploads = softPositiveInt(
    config.SELLER_MAX_UPLOADS_PER_DAY,
    DEFAULT_QUOTA.maxUploadsPerDay,
    'SELLER_MAX_UPLOADS_PER_DAY',
    log,
  );
  return {
    maxActiveListings: maxActive,
    maxUploadsPerDay: maxUploads,
    timeZone: DEFAULT_QUOTA.timeZone,
  };
}

function softPositiveInt(
  raw: unknown,
  fallback: number,
  key: string,
  log?: Logger,
): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (Number.isFinite(n) && Number.isInteger(n) && n > 0) return n;
  if (!softConfigLogged) {
    softConfigLogged = true;
    log?.warn(`seller quota: invalid ${key}=${String(raw)}; using default ${fallback}`);
  }
  return fallback;
}

export function pickQuotaLocale(acceptLanguage: string | undefined): QuotaLocale {
  const raw = (acceptLanguage ?? 'it').toLowerCase();
  if (raw.startsWith('en')) return 'en';
  if (raw.startsWith('es')) return 'es';
  return 'it';
}

export function throwQuotaExceeded(opts: {
  kind: 'uploadsPerDay' | 'activeListings';
  locale: QuotaLocale;
  retryAfterSeconds?: number;
}): never {
  const code =
    opts.kind === 'uploadsPerDay'
      ? 'errors.quota.uploadsPerDay'
      : 'errors.quota.activeListings';
  const message = QUOTA_MESSAGES[opts.kind][opts.locale];
  throw new HttpException(
    {
      message,
      code,
      retryAfterSeconds: opts.retryAfterSeconds,
    },
    HttpStatus.TOO_MANY_REQUESTS,
  );
}

/** Admin / ops roles are not rate-limited (brief AC). */
export function isQuotaExempt(user: AuthUser): boolean {
  if (user.roles.includes('admin')) return true;
  if (user.adminRoles?.length) return true;
  return false;
}

function isSubscriptionStatus(raw: string): raw is SubscriptionStatus {
  return raw === 'active' || raw === 'past_due' || raw === 'canceled';
}

@Injectable()
export class SellerQuotaService {
  private readonly logger = new Logger(SellerQuotaService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: ApiConfig,
  ) {}

  /** Env floor only — byte-identical for free users / flag-off. */
  quotaConfig(): QuotaConfig {
    return resolveQuotaConfig(this.config, this.logger);
  }

  async loadSellerSubscription(userId: string): Promise<SellerSubscription | null> {
    const rows = await this.db
      .select({
        status: sellerSubscription.status,
        currentPeriodEnd: sellerSubscription.currentPeriodEnd,
        cancelAtPeriodEnd: sellerSubscription.cancelAtPeriodEnd,
      })
      .from(sellerSubscription)
      .where(eq(sellerSubscription.userId, userId))
      .limit(1);
    const row = rows[0];
    if (!row || !isSubscriptionStatus(row.status)) return null;
    return {
      status: row.status,
      currentPeriodEnd: row.currentPeriodEnd,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    };
  }

  /**
   * Effective quota for the 429 path. When SELLER_PREMIUM_ENABLED is false,
   * returns the env floor unchanged (regression vs pre-T27).
   */
  async effectiveQuotaConfig(ownerUserId: string, now = new Date()): Promise<QuotaConfig> {
    const base = this.quotaConfig();
    if (!this.config.SELLER_PREMIUM_ENABLED) return base;
    const sub = await this.loadSellerSubscription(ownerUserId);
    const tier = resolveTier(sub, now);
    return quotaConfigFor(tier, base);
  }

  async resolveEntitlements(ownerUserId: string, now = new Date()) {
    const base = this.quotaConfig();
    if (!this.config.SELLER_PREMIUM_ENABLED) {
      return {
        tier: 'free' as const,
        entitlements: entitlementsFor('free'),
        quota: base,
      };
    }
    const sub = await this.loadSellerSubscription(ownerUserId);
    const tier = resolveTier(sub, now);
    return {
      tier,
      entitlements: entitlementsFor(tier),
      quota: quotaConfigFor(tier, base),
    };
  }

  /**
   * Media created_at for owner in the current Europe/Rome calendar day.
   * SQL date match + shared localDayKey filter so bucketing cannot drift.
   */
  async uploadTimesToday(ownerUserId: string, now = new Date()): Promise<Date[]> {
    const cfg = await this.effectiveQuotaConfig(ownerUserId, now);
    const day = localDayKey(now, cfg.timeZone);
    const rows = await this.db
      .select({ createdAt: media.createdAt })
      .from(media)
      .where(
        and(
          eq(media.ownerUserId, ownerUserId),
          sql`((${media.createdAt} AT TIME ZONE 'Europe/Rome')::date) = ${day}::date`,
        ),
      );
    return rows.map((r) => r.createdAt).filter((t) => localDayKey(t, cfg.timeZone) === day);
  }

  async assertUploadAllowed(
    ownerUserId: string,
    user: AuthUser,
    acceptLanguage?: string,
    now = new Date(),
  ): Promise<void> {
    if (isQuotaExempt(user)) return;
    const cfg = await this.effectiveQuotaConfig(ownerUserId, now);
    const prior = await this.uploadTimesToday(ownerUserId, now);
    const decision = evaluateUploadQuota(now, prior, cfg);
    if (decision.allowed) return;
    throwQuotaExceeded({
      kind: 'uploadsPerDay',
      locale: pickQuotaLocale(acceptLanguage),
      retryAfterSeconds: decision.retryAfterSeconds,
    });
  }

  async countActiveListings(ownerUserId: string): Promise<number> {
    const rows = await this.db
      .select({ n: count() })
      .from(listings)
      .where(and(eq(listings.ownerUserId, ownerUserId), eq(listings.status, 'published')));
    return Number(rows[0]?.n ?? 0);
  }

  async assertListingCreateAllowed(
    ownerUserId: string,
    user: AuthUser,
    acceptLanguage?: string,
  ): Promise<void> {
    if (isQuotaExempt(user)) return;
    const cfg = await this.effectiveQuotaConfig(ownerUserId);
    const active = await this.countActiveListings(ownerUserId);
    const decision = evaluateListingQuota(active, cfg);
    if (decision.allowed) return;
    throwQuotaExceeded({
      kind: 'activeListings',
      locale: pickQuotaLocale(acceptLanguage),
    });
  }
}

/** Test helper — reset soft-config once-log flag between tests. */
export function resetSoftConfigLogFlagForTests(): void {
  softConfigLogged = false;
}
