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
| MEDIA_PUBLIC_BASE | migration | Public CDN base for migrated media. |
| S3_REGION | migration / api | MinIO region (any value; path-style). |

## Phase 2 — auth
| Variable | Used by | Notes |
|---|---|---|
| DEV_AUTH | api | `true` trusts `x-dev-user` / `x-dev-roles` / `x-dev-email` headers (local/dev). |
| OIDC_ISSUER / OIDC_AUDIENCE / OIDC_JWKS_URL | api | Real Keycloak (or other OIDC) settings. |
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

## Phase 6 — cutover / observability
| Variable | Used by | Notes |
|---|---|---|
| NEXT_PUBLIC_SITE_URL | web | Canonical site URL for sitemap/robots/JSON-LD (e.g. `https://easycasaita.com`). |
| ACME_EMAIL | caddy (local profile) | Let's Encrypt contact for the Phase 6 Caddy build. |
| GRAFANA_ADMIN_PASSWORD / PG_EXPORTER_DSN | observability overlay | Optional Prometheus/Grafana stack. |
