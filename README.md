# EasyCasa — Phase 0 Skeleton

Foundation for re-platforming easycasaita.com into a modern PropTech app.
Monorepo → Docker Compose → single VPS behind Caddy. Code agent: Cursor.

## What's here
```
apps/web         Next.js (TypeScript) frontend — landing placeholder
apps/api         NestJS (TypeScript) backend — /health
services/ai      FastAPI (Python) — /health
packages/shared  Shared TS types + env schema (zod)
infra            docker-compose, Caddy, Postgres(PostGIS+pgvector), deploy & backup scripts
.cursor/rules    Conventions Cursor reads automatically
.github/workflows CI (lint/typecheck/test/build + pytest) and staging deploy
docs             env.md, vps-setup.md, phase-0.md (start here)
```

## Data layer (VPS-optimised)
- **PostgreSQL + PostGIS + pgvector** — one database for relational + geo + embeddings.
- **Meilisearch** — lightweight faceted search (no JVM).
- **Redis**, **MinIO** (S3-compatible), all self-hosted via Compose.

## Local quickstart
```bash
corepack enable
pnpm install
cp .env.example .env
docker compose -f infra/docker-compose.yml --env-file .env --profile caddy up -d --build
```

### Python AI service (local tests)
Requires Python 3.12+ (CI uses 3.12; 3.14 works with current deps).
```bash
cd services/ai
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
pytest   # from repo root: pytest services/ai
```
- Web: http://localhost
- API: http://localhost/api/health
- AI:  http://localhost/ai/health

## Deploy to the VPS
See `docs/vps-setup.md` (harden the box, install Docker, clone, `./infra/deploy.sh`).
CI deploys to staging on merge to `main` (set repo secrets: `STAGING_HOST`, `STAGING_USER`, `STAGING_SSH_KEY`).

## Definition of Done (every change)
Spec in `/docs` → `pnpm lint && pnpm typecheck && pnpm test` pass → verified on staging → human-reviewed → no secrets in git.

## Next
Work through `docs/phase-0.md`, then move to Phase 1 (data backbone & WordPress migration).
