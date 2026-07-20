# Phase 39 — Staging Hardening + Observability + Backups

**Goal:** bring the pilot to a state that's **safe, observable, and recoverable**.
Phase 6 shipped the ops *infrastructure*; Phase 39 closes the gaps: the API now
exposes `/metrics` and readiness for that infra to scrape, app-level error
tracking / request correlation, and the backup drill pushes freshness metrics
for its own stale-backup alert.

## Landed in this repo

```
apps/api/src/observability/**   # metrics, filter, request-id, Sentry seam, CSP, throttling
apps/api/src/health/**          # live/ready + Postgres/Meili/Redis indicators (registry)
infra/backup-restore-drill.sh   # dump → offsite → restore → verify → Pushgateway
infra/observability/prometheus/ # scrape api:4000 + backup freshness alerts
```

### Endpoints

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/metrics` | Prometheus text (`@Public`; restrict at edge) |
| GET | `/health/live` | Process up (no dep checks) |
| GET | `/health/ready` | **503** when any dependency is down |
| POST | `/csp-report` | CSP violation sink (204) |

Existing `GET /health` (seam snapshot) is unchanged.

### Adaptations vs scaffold

- `@Public` from `auth/public.decorator` (not scaffold `auth/decorators`).
- `HealthIndicatorRegistry` instead of Nest `multi` providers (same pattern as Phase 38 privacy).
- Redis optional: empty `REDIS_URL` → ready with `detail: not configured`.
- Prometheus scrape target fixed to `api:4000` (was `3001`).
- Drill default tables use `consent_records` (Phase 38), not `consents`.
- Backup alerts merged into `alerts.yml` (26h stale + fail gauge).
- Swagger `0.39.0`.

### Config

- `SENTRY_DSN` — empty → noop reporter; set to enable Sentry (inited in `main.ts`).
- Throttling: 120/min default; enquiry create + AVM estimate override to 10/min (Nest applies every named throttler globally, so no separate `sensitive` entry).

## Validation

```bash
npx pnpm@9.12.0 --filter @easycasa/api test   # includes metrics / readiness / exception-filter
npx pnpm@9.12.0 lint && npx pnpm@9.12.0 typecheck
bash -n infra/backup-restore-drill.sh
```
