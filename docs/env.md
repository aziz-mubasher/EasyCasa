# Environment Variables

Copy `.env.example` to `.env` and fill in real values. `.env` is git-ignored.
Whenever you add a variable in code, add it here and to `.env.example`.

| Variable | Used by | Notes |
|---|---|---|
| STAGING_DOMAIN | Caddy / Traefik | Public hostname, e.g. `staging.easycasaita.com`. Use `localhost` for local dev with Caddy. |
| POSTGRES_USER / _PASSWORD / _DB | db, api | Database credentials. |
| DATABASE_URL | api, migration | Full Postgres connection string. |
| REDIS_URL | api | Cache / queues. |
| MEILI_MASTER_KEY / MEILI_URL | api, meilisearch | Search engine. |
| MINIO_ROOT_USER / _PASSWORD / MINIO_BUCKET / S3_ENDPOINT | api, minio | Object storage. |
| API_PORT / WEB_PORT / AI_PORT | apps | Internal ports. |
| NODE_ENV | apps | `production` on the VPS. |
| RESTIC_REPOSITORY / RESTIC_PASSWORD | backup.sh | Optional offsite backups. |
