# Phase 0 — Foundations & Environment (checklist)

Goal: a skeleton that builds, runs locally, and deploys to the VPS before any feature work.

## Steps & acceptance criteria

- [ ] **1. Provision the VPS** — follow `docs/vps-setup.md`. Done when: SSH is key-only, ufw active, Docker installed, deploy user works.
- [ ] **2. Monorepo** — pnpm workspaces (web/api/shared) + Python venv for ai. Done when: `pnpm install` succeeds.
- [ ] **3. Cursor rules** — `.cursor/rules/*.mdc` present. Done when: Cursor picks up the global + per-app rules.
- [ ] **4. Scaffold apps** — NestJS `/health`, Next.js landing, FastAPI `/health`, with lint/typecheck/test. Done when: `pnpm lint && pnpm typecheck && pnpm test` pass, and `pytest services/ai` passes.
- [ ] **5. Compose + Caddy** — `infra/docker-compose.yml` + `infra/Caddyfile`. Done when: `docker compose ... up -d` brings up db, redis, meilisearch, minio, api, web, ai, caddy.
- [ ] **6. Env config** — `.env.example` + `docs/env.md`. Done when: copying to `.env` and filling values boots the stack.
- [ ] **7. CI** — `.github/workflows/ci.yml`. Done when: PRs run lint/typecheck/test/build (node) and pytest (ai) green.
- [ ] **8. Deploy pipeline** — `deploy.yml` + `infra/deploy.sh`. Done when: merge to `main` deploys skeleton to staging; `/api/health` returns ok.
- [ ] **9. Backups + monitoring** — `infra/backup.sh` in cron; Uptime Kuma + Netdata installed; Sentry DSN wired. Done when: a backup file exists offsite and uptime checks are green.

## Local quickstart
```bash
pnpm install
cp .env.example .env
docker compose -f infra/docker-compose.yml --env-file .env up -d --build
# web:  http://localhost
# api:  http://localhost/api/health
# ai:   http://localhost/ai/health
```

## Suggested Cursor prompts (one PR each)
1. "Read docs/phase-0.md and .cursor/rules. Wire class-validator + a global ValidationPipe into apps/api and add a config module reading env via @easycasa/shared. Add tests. Make lint/typecheck/test pass."
2. "Add Tailwind + next-intl (en/it/es) to apps/web with a shared layout and a language switcher. No hardcoded strings. Keep typecheck green."
3. "Add a docker-compose.override.yml for local dev with hot-reload volumes for api and web."
4. "Add Uptime Kuma and Netdata services to a separate infra/monitoring compose file with docs."
