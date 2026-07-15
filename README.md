# EasyCasa

Foundation for re-platforming easycasaita.com into a modern PropTech app.
Monorepo → Docker Compose → single VPS behind Traefik (or Caddy locally).

## What's here
```
apps/web         Next.js (TypeScript) frontend — landing placeholder
apps/api         NestJS (TypeScript) backend — /health
services/ai      FastAPI (Python) — /health
packages/shared  Shared TS types + env schema (zod)
migration        Phase 1 schema + WP ETL / geocode / media / redirects
infra            docker-compose, Traefik overlay, Postgres(PostGIS+pgvector), deploy & backup
.cursor/rules    Conventions Cursor reads automatically
.github/workflows CI + deploy
docs             phase-0.md, phase-1.md, schema.md, wp-audit.md, env.md, vps-setup.md
```

## Local quickstart
```bash
corepack enable
pnpm install
cp .env.example .env
docker compose -f infra/docker-compose.yml --env-file .env --profile caddy up -d --build
```

### Phase 1 — schema & WordPress migration
See `docs/phase-1.md` and `docs/wp-audit.md`.
```bash
# After Postgres is up (and WP MySQL available — live RO or local dump via docker-compose.migration.yml):
pnpm --filter @easycasa/migration migrate
pnpm --filter @easycasa/migration etl
pnpm --filter @easycasa/migration geocode
pnpm --filter @easycasa/migration media
pnpm --filter @easycasa/migration reconcile
pnpm --filter @easycasa/migration redirects
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
