# Environment Variables

Copy `.env.example` to `.env` and fill in real values. `.env` is git-ignored.
Whenever you add a variable in code, add it here and to `.env.example`.

| Variable | Used by | Notes |
|---|---|---|
| STAGING_DOMAIN | Caddy / Traefik | Public hostname, e.g. `easycasaita.com`. Use `localhost` for local dev with Caddy. |
| POSTGRES_USER / _PASSWORD / _DB | db, api | Database credentials. |
| DATABASE_URL | api, migration | Full Postgres connection string. |
| REDIS_URL | api | Cache / queues. |
| MEILI_MASTER_KEY / MEILI_URL | api, meilisearch | Search engine. |
| MINIO_ROOT_USER / _PASSWORD / MINIO_BUCKET / S3_ENDPOINT | api, minio | Object storage (local / fallback). |
| MEDIA_ORIGIN | api | `minio` (default) or `bunny` — listing image write target. |
| BUNNY_STORAGE_ZONE / BUNNY_STORAGE_PASSWORD | api | Bunny Storage Zone name + access key. Required when `MEDIA_ORIGIN=bunny`. Never commit password. |
| BUNNY_STORAGE_ENDPOINT / BUNNY_S3_REGION | api | Bunny S3 endpoint — use regional host e.g. `https://de-s3.storage.bunnycdn.com` (global `storage.bunnycdn.com` is rewritten from region). |
| BUNNY_CDN_BASE | api | Pull Zone base, e.g. `https://cdn.easycasaita.com`. |
| MEDIA_PRIVATE_BASE | api | Private `users/` doc URLs. Empty + bunny → API media proxy (not the public CDN). |
| API_PORT / WEB_PORT / AI_PORT | apps | Internal ports. |
| NODE_ENV | apps | `production` on the VPS. |
| RESTIC_REPOSITORY / RESTIC_PASSWORD | backup.sh | Optional offsite backups. |

## Phase 1 — migration variables
| Variable | Used by | Notes |
|---|---|---|
| WP_DB_HOST / _PORT / _USER / _PASSWORD / _NAME | migration | WordPress MySQL (read-only). |
| WP_TABLE_PREFIX | migration | Usually `wp_`. |
| WP_LISTING_POST_TYPE | migration | Custom post type of listings (from wp-audit). |
| WP_PERMALINK_BASE | migration | Old permalink base for redirect map. |
| WP_UPLOADS_BASE_URL | migration | Base URL of WP media. |
| GEOCODER / NOMINATIM_URL / GEOCODER_USER_AGENT | migration | Geocoding provider + polite UA. |
| MEDIA_PUBLIC_BASE | api, migration | Public base for **listing** media URLs. MinIO: `https://easycasaita.com/api/media/file`. Bunny: `https://cdn.easycasaita.com` (or set `BUNNY_CDN_BASE`). See `docs/media-hosting.md`. |
| S3_REGION | migration / api | MinIO region (any value; path-style). |

## Phase 2 — auth
| Variable | Used by | Notes |
|---|---|---|
| EC_TEST_AUTH | api | `true` only with `NODE_ENV=test` — trusts `x-dev-*` headers in vitest. **Never** on VPS. |
| ALLOW_PROVIDER_STUBS | api | Allows empty PSP/SdI/AML/RLI seams and optional OIDC at boot (local/CI). **Off** in pilot/production. |
| OIDC_ISSUER / OIDC_AUDIENCE / OIDC_JWKS_URL | api | Real Keycloak settings. **Required** when stubs/test-auth are off. |
| WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_OTP_TEMPLATE | api | Meta Cloud API. OTP template default name `easycasa_otp` (auth; separate from utility). Empty → OTP email fallback / no sends. |
| WHATSAPP_OTP_TEMPLATE_LANG / WHATSAPP_GRAPH_VERSION | api | Defaults `it` / `v21.0`. Also used as language for Phase C utility templates. |
| WHATSAPP_VERIFY_TOKEN | api | Meta webhook `hub.verify_token` for `GET /whatsapp/webhook`. |
| WHATSAPP_APP_SECRET | api | `X-Hub-Signature-256` on `POST /whatsapp/webhook`. Empty → **403 fail closed** (EC-17). |
| WHATSAPP_INBOUND_OPS_EMAIL | api | EC-17/19 ops alert target. Empty → `AGENCY_PUBLIC_EMAIL`. |
| WA_INBOUND_RETENTION_DAYS | api | EC-17 hard-delete window for `wa_inbound_messages` (default `90`). **COUNSEL TO CONFIRM.** |
| WA_INBOUND_EMAIL_FORWARD | api | EC-19. `true` → legacy body-bearing ops email. Default `false` → subject-line alert + admin link only (no bodies). |
| ADMIN_PUBLIC_URL | api | EC-19 base URL for inbound alert links (default `https://admin.easycasaita.com`). |
| WA_HANDLE_SECRET | api | EC-19a HMAC secret for opaque `wa_handle` routing (min 16). **Required at boot** — no silent fallback. Rotation breaks open `#whatsapp/<handle>` deep-links only — re-open from the list (do not blame the viewer). **Log every rotation** in the table below. |
| WHATSAPP_VIEWING_*_TEMPLATE / WHATSAPP_ENQUIRY_RECEIVED_TEMPLATE | api | K EC 8.7 Phase C utility templates. Empty name → skip that WhatsApp channel (email/in-app still run). |
| PHONE_OTP_PEPPER | api | SHA-256 pepper for OTP hashes (min 16 chars). |

### WhatsApp Nest secrets (ops preflight — six)

These six are the Nest-loaded set. **WABA ID is Meta-console only** — not a Nest env.

| # | Variable | Role |
|---|---|---|
| 1 | `WHATSAPP_TOKEN` | Cloud API permanent token |
| 2 | `WHATSAPP_PHONE_NUMBER_ID` | Phone number ID (same app as token) |
| 3 | `WHATSAPP_VERIFY_TOKEN` | Webhook `hub.verify_token` |
| 4 | `WHATSAPP_APP_SECRET` | `X-Hub-Signature-256` |
| 5 | Template name(s) | OTP + utility template **names** (language is a send param, not extra secrets) |
| 6 | `WA_HANDLE_SECRET` | EC-19a opaque list/detail routing HMAC |

**No secret dumps.** `docker compose config`, `env`, and `printenv` render the **full** resolved environment for that service — treat any one of them as having exposed every secret above (and siblings), not just the key you meant to inspect. That is what forced a prior rotation. Length-check inside the container only: `docker compose exec api sh -c 'echo ${#WHATSAPP_TOKEN}'` — never echo the value.

Full gate checklist: `docs/runbooks/whatsapp-cloud-ops-preflight.md`. Live inbound smoke (phone → auto-reply → forge → DSAR): `docs/runbooks/whatsapp-inbound-smoke.md`.

#### `WA_HANDLE_SECRET` rotation log

Record the date whenever this secret changes. A 404 on a bookmarked `#whatsapp/<handle>` after a rotation is expected — re-open from the inbound list.

| Rotated (UTC date) | Operator | Notes |
|---|---|---|
| 2026-07-31 | — | Initial production set (EC-19a ship). Fill operator after live inbound smoke. |

| Variable | Used by | Notes |
|---|---|---|
| KEYCLOAK_HOSTNAME | keycloak (VPS) | Public hostname (default `auth.easycasaita.com`). |
| KEYCLOAK_ADMIN / KEYCLOAK_ADMIN_PASSWORD | keycloak (VPS) | Bootstrap admin — set on VPS only; never commit. |
| KEYCLOAK_DB | keycloak (VPS) | Postgres database name (default `keycloak`; created by `infra/postgres/init/02-keycloak-db.sql`). |
| NEXT_PUBLIC_OIDC_ISSUER / NEXT_PUBLIC_OIDC_CLIENT_ID | web (build) | PKCE client for seeker sign-in (`easycasa-web`). Baked at image build. |
| NEXT_PUBLIC_MAP_STYLE | web (build) | MapLibre basemap style JSON URL (default: OpenFreeMap Liberty — keyless, OSM data). **Rebuild web** after changing. |
| NEXT_PUBLIC_VALUATION_BAND_ENABLED | web (build) | Show the provisional market valuation band on listing detail and add-listing price step. Must match API `VALUATION_BAND_ENABLED`. Rebuild web after changing. |
| VALUATION_BAND_ENABLED | api | Serve `GET /listings/:slug/valuation-band` and `POST /avm/band`. Uses OMI cache when populated, else stub comparables. Default `false`. |
| NEXT_PUBLIC_ASTE_ANALYSIS_ENABLED | web (build) | EC-22 — show dark `/[locale]/aste/analisi` upload UI. Must match API `ASTE_ANALYSIS_ENABLED`. Default `false` (redirects to `/aste`). |
| ASTE_ANALYSIS_ENABLED | api | EC-22 — authenticated `/aste/analyses*` endpoints. Default `false` → **404**. EC-26 admin `/admin/aste*` is **not** gated by this flag. |
| ASTE_DOCS_RETENTION_DAYS | api | EC-22 — purge aged submitted/failed analyses + MinIO objects (default `365`). **COUNSEL PENDING (LGL-1)**. |
| AI_INTERNAL_TOKEN | api + ai | EC-23 — shared secret for AI `/aste/*` (`X-EC-Internal`). Empty → Nest cannot call; AI rejects. |
| ASTE_PIPELINE_POLL_MS | api | EC-23 — worker poll interval (default `10000`). |
| ASTE_OCR_TIMEOUT_MS | api | EC-23 — per-doc OCR HTTP timeout (default `600000` = 10 min). |
| ASTE_EXTRACT_TIMEOUT_MS | api | EC-23 — extract HTTP timeout (default `300000`). |
| ASTE_EMBED_TIMEOUT_MS | api | EC-23 — embed HTTP timeout (default `120000`). |
| ASTE_TRANSLATE_TIMEOUT_MS | api | EC-24 — translate HTTP timeout (default `120000`). |
| ASTE_CHAT_TIMEOUT_MS | api | EC-25 — chat answer HTTP timeout (default `120000`). |
| ASTE_CHAT_Q_PER_ANALYSIS_DAY | api | EC-25 — max user questions per analysis per UTC day (default `20`). |
| ASTE_CHAT_Q_PER_USER_DAY | api | EC-25 — max user questions per user per UTC day (default `60`). |
| ASTE_PIPELINE_MAX_ATTEMPTS | api | EC-23 — max claim attempts before `failed` (default `2`). |
| ASTE_PIPELINE_STALE_MS | api | EC-23 — reclaim `processing` older than this (default `1800000` = 30 min). |
| SHARE_VIEW_HMAC_SECRET | api | Pepper for SmartLink daily unique-view SHA-256 hashes (min 16 chars). **No raw IP or visitor id stored** — see `docs/smartlink-view-tracking.md`. |
| AGENCY_PUBLIC_NAME / AGENCY_PUBLIC_EMAIL / AGENCY_PUBLIC_PHONE | api | Public agency block on SmartLink pages. |
| VITE_OIDC_ISSUER / VITE_OIDC_CLIENT_ID | admin (build) | Admin SPA PKCE (`easycasa-admin`). Required — there is no client-side auth bypass. |
| EXPO_PUBLIC_OIDC_ISSUER / EXPO_PUBLIC_OIDC_CLIENT_ID | mobile | PKCE client for Expo (`easycasa-app`). |
| OIDC_ROLES_CLAIM | api | Dot path to roles in JWT (default `realm_access.roles`). |

## Phase 3 — web / search
| Variable | Used by | Notes |
|---|---|---|
| API_URL | web (server) | Internal API base for server components (e.g. `http://api:4000`). |
| NEXT_PUBLIC_API_URL | web (browser) | Public API base behind Traefik/Caddy (e.g. `https://easycasaita.com/api`). |
| MEILI_URL / MEILI_MASTER_KEY | api | Meilisearch host + key (Phase 0 compose). |

## Phase 4 — AI
| Variable | Used by | Notes |
|---|---|---|
| EMBEDDING_PROVIDER | ai | `hashing` (offline default), `openai`, or `local`. |
| EMBEDDING_MODEL / EMBEDDING_DIM | ai | Model + vector dim (1536 matches `listings.embedding`). |
| CHAT_PROVIDER / CHAT_MODEL | ai | `none` = grounded templated fallback; `openai` calls an LLM. |
| USE_LLM_NLQ | ai | Use LLM to parse NL queries instead of heuristics. |
| OPENAI_BASE_URL / OPENAI_API_KEY | ai | OpenAI-compatible endpoint (OpenAI, Ollama, TEI, LiteLLM). |
| AI_RATE_LIMIT_PER_MIN | ai | Per-client cap on assistant calls. |
| AI_URL | web (server) | Internal AI base (e.g. `http://ai:8000`). |
| NEXT_PUBLIC_AI_URL | web (browser) | Public AI base (e.g. `https://easycasaita.com/ai`). |

## Phase 5 — billing / notifications
| Variable | Used by | Notes |
|---|---|---|
| STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET | api | Stripe server key + webhook signing secret. Empty = billing disabled safely. **Live keys (`sk_live_*`) refuse boot unless `GO_LIVE_PAYMENTS_ACK=true`.** |
| PAYMENTS_ENABLED | api | `true` enables fixed-fee catalog checkout + Stripe PaymentIntents (test mode first). Requires `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`. Default `false`. |
| GO_LIVE_PAYMENTS_ACK | api | Explicit human ack before accepting `sk_live_*`. Default `false`. |
| PAYMENTS_SUCCESS_URL / PAYMENTS_CANCEL_URL | api | Redirect targets for embedded checkout return (web success/cancel pages). |
| NEXT_PUBLIC_PAYMENTS_ENABLED | web (build) | Shows pay path on `/pricing`. Must match API `PAYMENTS_ENABLED`. Rebuild web after changing. |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | web (build) | Stripe `pk_test_*` / `pk_live_*` for Payment Element. Never commit real keys. |
| BILLING_SUCCESS_URL / BILLING_CANCEL_URL | api | Checkout redirect targets. |
| CURRENCY | api | Default charge currency (e.g. `eur`). |
| SMTP_URL / NOTIFY_FROM | api | Email transport (console fallback when unset). |
| CORS_ORIGINS | api | Comma-separated browser origins (public site + `app.` shell). |

## Phase 6 — cutover / observability
| Variable | Used by | Notes |
|---|---|---|
| NEXT_PUBLIC_SITE_URL | web | Canonical site URL for sitemap/robots/JSON-LD (e.g. `https://easycasaita.com`). |
| ACME_EMAIL | caddy (local profile) | Let's Encrypt contact for the Phase 6 Caddy build. |
| GRAFANA_ADMIN_PASSWORD / PG_EXPORTER_DSN | observability overlay | Optional Prometheus/Grafana stack. |

## Phase 7 — universal app (Expo)
| Variable | Used by | Notes |
|---|---|---|
| EXPO_PUBLIC_API_BASE_URL | mobile | API base (e.g. `https://easycasaita.com/api`). |
| EXPO_PUBLIC_OIDC_ISSUER | mobile | Keycloak issuer for PKCE (`easycasa-app` public client). |
| EXPO_PUBLIC_OIDC_CLIENT_ID | mobile | Defaults to `easycasa-app`. |
| EXPO_PUBLIC_WEB_APP_URL | mobile | Hosted Expo web shell (`https://app.easycasaita.com`). |
| EXPO_TOKEN | CI / EAS | Optional — Expo access token for cloud native builds. |

## Phase 10 — orders + mandate (incarico)
| Variable | Used by | Notes |
|---|---|---|
| SIGNATURE_PROVIDER_URL / SIGNATURE_PROVIDER_KEY | api | Hosted FEA/QES provider. Empty → stub signing URLs (dev only). |
| SIGNATURE_WEBHOOK_SECRET | api | HMAC-SHA256 secret for `x-signature` on `POST /webhooks/signature`. Required when provider stubs are off. |

## Phase 12 — rentals (RLI) + AML/KYC
| Variable | Used by | Notes |
|---|---|---|
| RLI_CHANNEL_URL / RLI_CHANNEL_CREDENTIAL | api | Entratel/RLI-web telematic seam. Empty + `ALLOW_PROVIDER_STUBS` → stub protocollo; production must configure. |
| AML_SCREENING_URL / AML_SCREENING_KEY | api | PEP/sanctions screening. Empty + `ALLOW_PROVIDER_STUBS` → clean screen; otherwise fails safe (errors). |
| PSP_API_URL / PSP_SECRET_KEY | api | Phase 17 order PaymentIntents seam. Empty + `ALLOW_PROVIDER_STUBS` → stub client secret. |
| SDI_CHANNEL_URL / SDI_CHANNEL_KEY | api | Phase 17 SdI fattura transmission. Empty + `ALLOW_PROVIDER_STUBS` → stub protocollo. |
| EASYCASA_PIVA / EASYCASA_DENOMINAZIONE | api | Cedente on fattura elettronica (defaults to Easy Casa Ita). |

## Phase 22 / 30 — notification seams + ops
| Variable | Used by | Notes |
|---|---|---|
| PUSH_PROVIDER_URL | api | Optional push HTTP seam (alerts, enquiries, viewings). Empty → console transport. |
| EMAIL_PROVIDER_URL | api | Optional email HTTP seam alongside `SMTP_URL`. Empty → console / SMTP fallback. |
| KEYCLOAK_ADMIN / KEYCLOAK_ADMIN_PASSWORD | keycloak overlay | Only for `make keycloak` local OIDC — not used on Traefik VPS. |

## Phase 38 — GDPR retention
| Variable | Used by | Notes |
|---|---|---|
| RETENTION_LEAD_DAYS | api | Days before unconverted enquiry leads are anonymized (default `90`). |

## EC-1 — Banks4All attestation
| Variable | Used by | Notes |
|---|---|---|
| BANKS4ALL_ATTESTATION_BASE_URL | api | Origin for B4A-1 `GET /v1/attestations/:token` (e.g. `https://portal.banks4all.eu`). Empty → fail soft. |
| BANKS4ALL_PARTNER_TOKEN | api | Bearer token matching Banks4All `B4A_PARTNER_TOKEN`. Empty → fail soft. |

## K EC 4.1 — Internal CRM
| Variable | Used by | Notes |
|---|---|---|
| CRM_ENABLED | api | Default `false` (local/CI/demo). §1.6 Q2a **consent applied** 2026-08-02 — production may set `true`. See `docs/legal/crm-controller-responsibility.md`. |
| CRM_DORMANT_RETENTION_MONTHS | api | Dormant seeker anonymisation window (default `24`). Confirmed for enablement with Q2a consent; counsel may refine later. |

## EC-15 — Demo environment
| Variable | Used by | Notes |
|---|---|---|
| DEMO_MODE | api | `true` on demo stack only. Forces email noop (ignores SMTP/HTTP), disables WhatsApp Cloud send. Compose also blanks outbound secrets. |
| NEXT_PUBLIC_DEMO_MODE | web (build) | Permanent Italian demo banner + `robots` disallow + meta noindex. |
| DEMO_DOMAIN | compose demo | Traefik host, default `demo.easycasaita.com`. See `.env.demo.example`. |

## Phase 39 — observability
| Variable | Used by | Notes |
|---|---|---|
| SENTRY_DSN | api | Sentry DSN for 5xx reporting. Empty → fail-soft noop (logs only). |
| PUSHGATEWAY_URL | backup-restore-drill.sh | Prometheus Pushgateway for backup freshness metrics. |
| CRITICAL_TABLES | backup-restore-drill.sh | Space-separated tables to verify after restore (default includes `consent_records`). |

## Phase 13 — admin console
| Variable | Used by | Notes |
|---|---|---|
| VITE_API_BASE_URL | admin (build) | API base for the SPA (e.g. `https://easycasaita.com/api`). |
| VITE_OIDC_ISSUER / VITE_OIDC_CLIENT_ID | admin (build) | Required PKCE. Do **not** set any client auth bypass variable — absent, not false. |

## EC-S Phase 1 — seller listing (T06–T12)
| Variable | Used by | Notes |
|---|---|---|
| SELLER_ONBOARDING_ENABLED | api | Default `false`. Enable only after signed T05 Layer 1. Routes 404 when off. |
| INFORMATIVA_SELLER_VERSION | api | Version id stored on `seller_profile`. Empty ⇒ refuse onboarding insert. |
| MEDIA_CDN_ENABLED | api | Default `false` until Bunny DPA (T05). `MEDIA_ORIGIN=bunny` refused while false. |
| IMAGE_DUPDETECT_ENFORCE | api | Default `false` (flag-only week). When true, DUPLICATE uploads are blocked. |
| SELLER_MAX_ACTIVE_LISTINGS | api | Default `5`. Hard 429 on listing create when seller has this many **published** listings. Art. 6(1)(b) — not LIA-gated. Soft-parse invalid → default. |
| SELLER_MAX_UPLOADS_PER_DAY | api | Default `20`. Hard 429 on media upload/confirm/presign per Europe/Rome calendar day. Soft-parse invalid → default. |
| NOMINATIM_URL / GEOCODER_USER_AGENT | api | Runtime geocode for `POST /omi/resolve` (T08). |

## EC-S Phase 2 — Verified Owner (T14–T16)
| Variable | Used by | Notes |
|---|---|---|
| VERIFIED_OWNER_ENABLED | api | Default `false`. Enable after T05 Layer 1 + §6.3. VO routes 404 when off. |
| VERIFIED_OWNER_VALIDITY_MONTHS | api | Default `12`. Sets `expires_at` on VERIFY (T05 retention window). |
| SELLER_CHECKLIST_ENABLED | api | Default `false`. T18 private-seller checklist (P6); not fascicolo. |

## EC-S Phase 3 — seller inbox (T20)
| Variable | Used by | Notes |
|---|---|---|
| SELLER_INBOX_ENABLED | api | Default `false`. Seller enquiry inbox (`/seller/enquiries`) returns 404 when off. Enable after G1. |
