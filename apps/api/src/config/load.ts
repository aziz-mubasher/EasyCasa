import { z } from 'zod';

const bool = (def: boolean) =>
  z.string().optional().transform((v) => (v == null ? def : v === 'true'));

const Schema = z
  .object({
    API_PORT: z.coerce.number().default(4000),
    NODE_ENV: z.string().default('production'),
    DATABASE_URL: z.string().url(),

    // Auth (OIDC). In dev, DEV_AUTH=true trusts x-dev-* headers instead.
    DEV_AUTH: bool(false),
    OIDC_ISSUER: z
      .string()
      .optional()
      .transform((v) => (v && v.trim() ? v.trim() : undefined)),
    OIDC_AUDIENCE: z
      .string()
      .optional()
      .transform((v) => (v && v.trim() ? v.trim() : undefined)),
    OIDC_JWKS_URL: z
      .string()
      .optional()
      .transform((v) => (v && v.trim() ? v.trim() : undefined)),
    OIDC_ROLES_CLAIM: z.string().default('realm_access.roles'),

    // Billing (Stripe — hosted checkout, no card data on our servers)
    STRIPE_SECRET_KEY: z.string().default(''),
    STRIPE_WEBHOOK_SECRET: z.string().default(''),
    BILLING_SUCCESS_URL: z.string().default('https://easycasaita.com/it/account?billing=success'),
    BILLING_CANCEL_URL: z.string().default('https://easycasaita.com/it/account?billing=cancel'),
    CURRENCY: z.string().default('eur'),

    // Notifications (email transport; console fallback when unset)
    SMTP_URL: z.string().default(''),
    NOTIFY_FROM: z.string().default('EasyCasa <no-reply@easycasaita.com>'),

    // CORS — comma-separated origins for the public site + universal app shell
    CORS_ORIGINS: z
      .string()
      .default(
        'https://easycasaita.com,https://www.easycasaita.com,https://app.easycasaita.com,http://localhost:3000,http://localhost:8081',
      ),

    // Search (Meilisearch)
    MEILI_URL: z.string().default('http://meilisearch:7700'),
    MEILI_MASTER_KEY: z.string().default('change_me_meili_key'),

    // Object storage (MinIO / S3)
    S3_ENDPOINT: z.string().default('http://minio:9000'),
    S3_REGION: z.string().default('us-east-1'),
    MINIO_ROOT_USER: z.string().default('easycasa'),
    MINIO_ROOT_PASSWORD: z.string().default('change_me_minio'),
    MINIO_BUCKET: z.string().default('easycasa-media'),
    MEDIA_PUBLIC_BASE: z.string().default('http://localhost:9000/easycasa-media'),

    // Phase 10 — e-signature (FEA/QES). Empty URL/KEY → stub envelopes in DEV.
    SIGNATURE_PROVIDER_URL: z.string().default(''),
    SIGNATURE_PROVIDER_KEY: z.string().default(''),
    SIGNATURE_WEBHOOK_SECRET: z.string().default(''),

    // Phase 12 — RLI + AML screening
    RLI_CHANNEL_URL: z.string().default(''),
    RLI_CHANNEL_CREDENTIAL: z.string().default(''),
    AML_SCREENING_URL: z.string().default(''),
    AML_SCREENING_KEY: z.string().default(''),

    // Phase 17 — PSP + SdI (fattura elettronica)
    PSP_API_URL: z.string().default(''),
    PSP_SECRET_KEY: z.string().default(''),
    SDI_CHANNEL_URL: z.string().default(''),
    SDI_CHANNEL_KEY: z.string().default(''),
    EASYCASA_PIVA: z.string().default('IT00000000000'),
    EASYCASA_DENOMINAZIONE: z.string().default('Easy Casa Ita Srl'),

    // Phase 22 / 30 — notification provider seams (fail soft when empty)
    PUSH_PROVIDER_URL: z.string().default(''),
    EMAIL_PROVIDER_URL: z.string().default(''),

    // Cache / queues (compose Redis; optional for single-node API)
    REDIS_URL: z.string().default(''),

    // Phase 38 — GDPR retention window for unconverted enquiry leads (days)
    RETENTION_LEAD_DAYS: z.coerce.number().int().positive().default(90),

    // Phase 39 — error tracking (empty → fail-soft noop reporter)
    SENTRY_DSN: z.string().default(''),
  })
  .superRefine((cfg, ctx) => {
    // When DEV_AUTH is off, OIDC must be fully configured (Phase 16 fail-fast).
    if (cfg.DEV_AUTH) return;
    for (const key of ['OIDC_ISSUER', 'OIDC_AUDIENCE', 'OIDC_JWKS_URL'] as const) {
      if (!cfg[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required when DEV_AUTH is not true`,
        });
      }
    }
  });

export type ApiConfig = z.infer<typeof Schema>;
/** Alias used by Phase 33 seam adapters / `@InjectConfig()`. */
export type AppConfig = ApiConfig;

let cachedProcessEnv: ApiConfig | null = null;

/** Parse API env. Memoizes when reading `process.env` (Phase 33 boot gate). */
export function loadApiConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  if (env === process.env && cachedProcessEnv) return cachedProcessEnv;
  const parsed = Schema.parse(env);
  if (env === process.env) cachedProcessEnv = parsed;
  return parsed;
}

/** Drop memoized process.env parse — used by boot-check after seeding test env. */
export function resetConfigCache(): void {
  cachedProcessEnv = null;
}

/**
 * Live config view. Proxied so `resetConfigCache()` + re-load picks up new env
 * without every call site switching to `loadApiConfig()`.
 */
export const apiConfig: ApiConfig = new Proxy({} as ApiConfig, {
  get(_target, prop) {
    const cfg = loadApiConfig();
    const value = cfg[prop as keyof ApiConfig];
    return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(cfg) : value;
  },
});
