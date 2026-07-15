# EasyCasa

Foundation for re-platforming easycasaita.com into a modern PropTech app.
Monorepo → Docker Compose → single VPS behind Traefik (or Caddy locally).

## What's here
```
apps/web         Next.js (TypeScript) — map-first search, i18n IT/EN/ES
apps/api         NestJS (TypeScript) backend — listings, search, auth
services/ai      FastAPI (Python) — /health
packages/shared  Shared TS types + env schema (zod)
migration        Phase 1 schema + WP ETL / geocode / media / redirects
infra            docker-compose, Traefik overlay, Postgres(PostGIS+pgvector), deploy & backup
.cursor/rules    Conventions Cursor reads automatically
.github/workflows CI + deploy
docs             phase-0..3, schema.md, wp-audit.md, env.md, vps-setup.md
```

## Local quickstart
```bash
corepack enable
pnpm install
cp .env.example .env
docker compose -f infra/docker-compose.yml --env-file .env --profile caddy up -d --build
```

### Phase 2 — Core API
See `docs/phase-2.md` and `docs/api.md`.
```bash
pnpm --filter @easycasa/migration migrate   # applies 0004 favorites/saved_searches
pnpm --filter @easycasa/api start:dev
# Swagger: http://localhost/api/docs (or :4000/docs)
# Dev auth: DEV_AUTH=true + headers x-dev-user / x-dev-roles / x-dev-email
```

### Phase 3 — Frontend + Search
See `docs/phase-3.md`.
```bash
pnpm --filter @easycasa/api search:backfill   # index listings into Meilisearch
pnpm --filter @easycasa/web dev               # http://localhost:3000/it
```

### Python AI service (local tests)
```bash
cd services/ai
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
pytest   # from repo root: pytest services/ai
```

## Deploy
See `docs/vps-setup.md`. On the shared Hostinger VPS, Traefik routes `easycasaita.com` (Caddy is skipped automatically).

## Definition of Done
Spec in `/docs` → `pnpm lint && pnpm typecheck && pnpm test` pass → verified on staging → human-reviewed → no secrets in git.
