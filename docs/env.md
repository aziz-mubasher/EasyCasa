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
