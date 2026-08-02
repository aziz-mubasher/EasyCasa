import { z } from 'zod';

const bool = (def: boolean) =>
  z.string().optional().transform((v) => (v == null ? def : v === 'true'));

const Schema = z
  .object({
    API_PORT: z.coerce.number().default(4000),
    NODE_ENV: z.string().default('production'),
    DATABASE_URL: z.string().url(),

    // Auth. Header bypass only via EC_TEST_AUTH under NODE_ENV=test.
    // Provider stubs use ALLOW_PROVIDER_STUBS (not an auth bypass).
    EC_TEST_AUTH: bool(false),
    ALLOW_PROVIDER_STUBS: bool(false),
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

    // WhatsApp Cloud API (K EC 7.1) — empty token → OTP email fallback / no sends
    WHATSAPP_TOKEN: z.string().default(''),
    WHATSAPP_PHONE_NUMBER_ID: z.string().default(''),
    WHATSAPP_OTP_TEMPLATE: z.string().default(''),
    WHATSAPP_OTP_TEMPLATE_LANG: z.string().default('it'),
    WHATSAPP_GRAPH_VERSION: z.string().default('v21.0'),
    /** Meta webhook hub.verify_token (GET challenge). */
    WHATSAPP_VERIFY_TOKEN: z.string().default(''),
    /** App secret for X-Hub-Signature-256 on POST webhook. Empty → reject (fail closed). */
    WHATSAPP_APP_SECRET: z.string().default(''),
    /** EC-17 — ops mailbox for inbound WhatsApp forwards (falls back to AGENCY_PUBLIC_EMAIL). */
    WHATSAPP_INBOUND_OPS_EMAIL: z.string().default(''),
    /** EC-17 — days before wa_inbound_messages hard-delete. COUNSEL TO CONFIRM (default 90). */
    WA_INBOUND_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
    /**
     * EC-19 — when true, ops email includes full message body (legacy ungoverned copy).
     * Default false: subject-line alert + admin link only (no bodies).
     */
    WA_INBOUND_EMAIL_FORWARD: bool(false),
    /** EC-19 — base URL for admin SPA links in inbound alerts. */
    ADMIN_PUBLIC_URL: z.string().default('https://admin.easycasaita.com'),
    /**
     * EC-19a — HMAC secret for opaque wa_handle routing keys.
     * Required at boot (min 16). No silent fallback. Rotation breaks open UI deep-links only.
     */
    WA_HANDLE_SECRET: z.string().min(16),
    /** K EC 8.7 Phase C — utility template names (empty → skip that WhatsApp send). */
    WHATSAPP_VIEWING_REMINDER_24H_TEMPLATE: z.string().default(''),
    WHATSAPP_VIEWING_REMINDER_2H_TEMPLATE: z.string().default(''),
    WHATSAPP_VIEWING_REQUESTED_TEMPLATE: z.string().default(''),
    WHATSAPP_VIEWING_CONFIRMED_TEMPLATE: z.string().default(''),
    WHATSAPP_VIEWING_CANCELLED_TEMPLATE: z.string().default(''),
    WHATSAPP_ENQUIRY_RECEIVED_TEMPLATE: z.string().default(''),
    PHONE_OTP_PEPPER: z.string().min(16).default('dev-phone-otp-pepper-change-me'),

    // Billing (Stripe — hosted checkout, no card data on our servers)
    STRIPE_SECRET_KEY: z.string().default(''),
    STRIPE_WEBHOOK_SECRET: z.string().default(''),
    /** K EC 1.38 — order payments (fixed-fee catalog). Default off until counsel + SdI go-live. */
    PAYMENTS_ENABLED: bool(false),
    /** Must be true to boot with sk_live_* — explicit human ack before real charges. */
    GO_LIVE_PAYMENTS_ACK: bool(false),
    PAYMENTS_SUCCESS_URL: z
      .string()
      .default('https://easycasaita.com/it/pagamento/successo'),
    PAYMENTS_CANCEL_URL: z
      .string()
      .default('https://easycasaita.com/it/pagamento/annullato'),
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

    // Object storage (MinIO / S3, or Bunny Storage Zone via MEDIA_ORIGIN=bunny)
    MEDIA_ORIGIN: z.enum(['minio', 'bunny']).default('minio'),
    S3_ENDPOINT: z.string().default('http://minio:9000'),
    S3_REGION: z.string().default('us-east-1'),
    MINIO_ROOT_USER: z.string().default('easycasa'),
    MINIO_ROOT_PASSWORD: z.string().default('change_me_minio'),
    MINIO_BUCKET: z.string().default('easycasa-media'),
    /** Listing image public URLs (CDN when on Bunny; API proxy when MinIO-only). */
    MEDIA_PUBLIC_BASE: z.string().default('http://localhost:9000/easycasa-media'),
    /**
     * Private `users/` document URLs. Empty → when MEDIA_ORIGIN=bunny, defaults to
     * the API media proxy so fascicolo docs are not exposed on the public CDN.
     */
    MEDIA_PRIVATE_BASE: z.string().default(''),
    /** Bunny Storage Zone name (S3 access key id + bucket). Required when MEDIA_ORIGIN=bunny. */
    BUNNY_STORAGE_ZONE: z.string().default(''),
    /** Bunny Storage Zone password / FTP password. Never commit. Required when MEDIA_ORIGIN=bunny. */
    BUNNY_STORAGE_PASSWORD: z.string().default(''),
    BUNNY_STORAGE_ENDPOINT: z.string().default('https://storage.bunnycdn.com'),
    /** Pull Zone custom hostname, e.g. https://cdn.easycasaita.com */
    BUNNY_CDN_BASE: z.string().default(''),
    /** Bunny S3 region hint (zone region code, e.g. de / uk). */
    BUNNY_S3_REGION: z.string().default('de'),

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

    // EC-1 — Banks4All B4A-1 partner attestation (empty → fail soft, no badge)
    BANKS4ALL_ATTESTATION_BASE_URL: z.string().default(''),
    BANKS4ALL_PARTNER_TOKEN: z.string().default(''),

    /**
     * EC-15 — demo stack. When true: never send email/WhatsApp outbound; ignore
     * SMTP/EMAIL_PROVIDER/WhatsApp tokens even if set (compose also blanks them).
     */
    DEMO_MODE: bool(false),

    // Phase 39 — error tracking (empty → fail-soft noop reporter)
    SENTRY_DSN: z.string().default(''),

    /** K EC 1.26 — provisional valuation band (stub comparables; not OMI yet). */
    VALUATION_BAND_ENABLED: bool(false),

    /**
     * K EC 4.1 — internal CRM. Default false until counsel clears Art. 13
     * informativa + retention (COUNSEL-REVIEW-PACKAGE §1.6 Q2a). Company
     * controller responsibility acknowledgment does not flip this flag.
     */
    CRM_ENABLED: bool(false),
    /** Dormant seeker anonymisation window (months). COUNSEL TO CONFIRM (Q2a). */
    CRM_DORMANT_RETENTION_MONTHS: z.coerce.number().int().positive().default(24),

    /** K EC 1.29 — HMAC pepper for SmartLink daily unique-view hashes (no raw IP stored). */
    SHARE_VIEW_HMAC_SECRET: z.string().min(16).default('dev-smartlink-view-secret-change-me'),

    AGENCY_PUBLIC_NAME: z.string().default('Easy Casa Italy'),
    AGENCY_PUBLIC_EMAIL: z.string().default('info@easycasaita.com'),
    AGENCY_PUBLIC_PHONE: z.string().default(''),
  })
  .superRefine((cfg, ctx) => {
    const stripeKey = cfg.STRIPE_SECRET_KEY.trim();
    if (stripeKey.startsWith('sk_live_') && !cfg.GO_LIVE_PAYMENTS_ACK) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['STRIPE_SECRET_KEY'],
        message:
          'Live Stripe key (sk_live_*) refused: set GO_LIVE_PAYMENTS_ACK=true only after counsel sign-off',
      });
    }
    if (cfg.PAYMENTS_ENABLED) {
      if (!stripeKey) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['PAYMENTS_ENABLED'],
          message: 'PAYMENTS_ENABLED requires STRIPE_SECRET_KEY (use sk_test_* in test mode)',
        });
      }
      if (!cfg.STRIPE_WEBHOOK_SECRET.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['STRIPE_WEBHOOK_SECRET'],
          message: 'PAYMENTS_ENABLED requires STRIPE_WEBHOOK_SECRET for signed webhooks',
        });
      }
    }

    // When provider stubs / test auth are off, OIDC must be fully configured.
    if (cfg.ALLOW_PROVIDER_STUBS || cfg.EC_TEST_AUTH) return;
    for (const key of ['OIDC_ISSUER', 'OIDC_AUDIENCE', 'OIDC_JWKS_URL'] as const) {
      if (!cfg[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required when ALLOW_PROVIDER_STUBS/EC_TEST_AUTH are not true`,
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
