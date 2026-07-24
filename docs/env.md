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
| MINIO_ROOT_USER / _PASSWORD / MINIO_BUCKET / S3_ENDPOINT | api, minio | Object storage. |
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
| MEDIA_PUBLIC_BASE | api, migration | Public base URL for media objects. On the VPS MinIO is not browser-reachable and `cdn.easycasaita.com` is unused — set to `https://easycasaita.com/api/media/file` so keys resolve via the API read proxy (`GET /media/file/*`). |
| S3_REGION | migration / api | MinIO region (any value; path-style). |

## Phase 2 — auth
| Variable | Used by | Notes |
|---|---|---|
| DEV_AUTH | api | `true` trusts `x-dev-user` / `x-dev-roles` / `x-dev-email` headers (local/dev). When `false`, boot fails unless OIDC_* are set (Phase 16). |
| OIDC_ISSUER / OIDC_AUDIENCE / OIDC_JWKS_URL | api | Real Keycloak settings. **Required** when `DEV_AUTH` is not `true`. JWKS must be reachable for pilot preflight. |
| KEYCLOAK_HOSTNAME | keycloak (VPS) | Public hostname (default `auth.easycasaita.com`). |
| KEYCLOAK_ADMIN / KEYCLOAK_ADMIN_PASSWORD | keycloak (VPS) | Bootstrap admin — set on VPS only; never commit. |
| KEYCLOAK_DB | keycloak (VPS) | Postgres database name (default `keycloak`; created by `infra/postgres/init/02-keycloak-db.sql`). |
| NEXT_PUBLIC_OIDC_ISSUER / NEXT_PUBLIC_OIDC_CLIENT_ID | web (build) | PKCE client for seeker sign-in (`easycasa-web`). Baked at image build. |
| NEXT_PUBLIC_MAP_STYLE | web (build) | MapLibre basemap style JSON URL (default: OpenFreeMap Liberty — keyless, OSM data). **Rebuild web** after changing. Startup logs ERROR if unset in production builds. |
| VITE_OIDC_ISSUER / VITE_OIDC_CLIENT_ID / VITE_DEV_AUTH | admin (build) | Admin SPA PKCE client (`easycasa-admin`). Keep `VITE_DEV_AUTH=true` until Keycloak is live; see `docs/runbooks/oidc-cutover.md`. |
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
| STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET | api | Stripe server key + webhook signing secret. Empty = billing disabled safely. |
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
| SIGNATURE_WEBHOOK_SECRET | api | HMAC-SHA256 secret for `x-signature` on `POST /webhooks/signature`. Required when `DEV_AUTH` is false. |

## Phase 12 — rentals (RLI) + AML/KYC
| Variable | Used by | Notes |
|---|---|---|
| RLI_CHANNEL_URL / RLI_CHANNEL_CREDENTIAL | api | Entratel/RLI-web telematic seam. Empty + `DEV_AUTH` → stub protocollo; production must configure. |
| AML_SCREENING_URL / AML_SCREENING_KEY | api | PEP/sanctions screening. Empty + `DEV_AUTH` → clean screen; otherwise fails safe (errors). |
| PSP_API_URL / PSP_SECRET_KEY | api | Phase 17 order PaymentIntents seam. Empty + `DEV_AUTH` → stub client secret. |
| SDI_CHANNEL_URL / SDI_CHANNEL_KEY | api | Phase 17 SdI fattura transmission. Empty + `DEV_AUTH` → stub protocollo. |
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
| VITE_DEV_AUTH | admin (build) | When `true`, SPA sends `x-dev-user/roles` admin headers. Disable when OIDC is wired. |
