# Phase 40 — Pilot Readiness: Seed, Smoke, Runbook

**Goal:** the final go/no-go for the seeker pilot. Executable **preflight** +
**smoke** tooling, plus the runbook and pilot scope template.

## Landed in this repo

```
apps/api/src/pilot/smoke/pilot-preflight.ts   # go/no-go over env + readiness + seed
apps/api/src/pilot/smoke/pilot-smoke.ts       # seeker journey (contract | live)
apps/api/src/pilot/smoke/run-smoke.ts         # CLI exit 0/1
apps/api/src/pilot/seed/seed-cli.ts           # sink-agnostic seed runner
apps/api/src/pilot/seed/run-seed.ts           # Nest context → DrizzleListingSink
apps/api/test/pilot/pilot-smoke.spec.ts
apps/api/test/pilot/pilot-preflight.spec.ts
docs/phase-40.md
```

Also: `POST /admin/pilot/seed` (Phase 37) remains the HTTP seed path.

### Adaptations vs scaffold

- Paths have **no** Nest `/api` prefix — set `BASE_URL=https://easycasaita.com/api`.
- OIDC check uses `OIDC_JWKS_URL` (accepts `OIDC_JWKS_URI` as alias).
- Smoke `target=contract` (reference app) vs `target=live` (real Nest DTOs +
  optional consent bootstrap before enquiry).
- Readiness uses `HealthIndicatorRegistry` (not Nest `multi`).

### CLI

```bash
# Seed (needs DATABASE_URL + Meili; build first)
pnpm --filter @easycasa/api build
pnpm --filter @easycasa/api pilot:seed

# Smoke against staging (live controllers + OIDC bearer from a real seeker login)
BASE_URL=https://easycasaita.com/api SMOKE_TARGET=live \
  SMOKE_BEARER=<access_token_from_keycloak> \
  pnpm --filter @easycasa/api pilot:smoke
# Local only (DEV_AUTH=true): SMOKE_DEV_USER=smoke-seeker instead of SMOKE_BEARER
```

## Pilot go / no-go checklist

**Automated (`runPreflight` against staging):**
- [ ] `DEV_AUTH=false`; OIDC set (`OIDC_ISSUER`, `OIDC_JWKS_URL`, `OIDC_AUDIENCE`)
- [ ] JWKS URL reachable (HTTP GET succeeds)
- [ ] Email transport + SPF/DKIM/DMARC
- [ ] `/health/ready` green; Sentry preferred (warn if missing)
- [ ] Pilot seed applied

**In-tree:**
- [x] 32–39.1 merged; consolidation e2e green
- [ ] `boot-check` + `test:int` / seeker-journey.int when Docker available

**Human:**
- [ ] Legal templates counsel/DPO sign-off
- [ ] Backup-restore drill on staging
- [ ] Pilot scope agreed with client (template below)

## Rollback

1. Trigger: smoke fails, error spike, readiness flaps.
2. Redeploy previous image (`./infra/deploy.sh` from prior tag / previous commit).
3. Re-run smoke; if data implicated, restore from verified backup (Phase 39 drill).

## Support runbook

| Symptom | Action |
| --- | --- |
| No confirmation email | `SMTP_URL` / outbox; SPF/DKIM |
| Enquiry 403 | Grant privacy + mediation consents first |
| Everything 401 | Check `OIDC_*` / Keycloak |
| Empty map | `pilot:seed` or `POST /admin/pilot/seed` |
| 503 ready | Check postgres/meili/redis indicators |
| Slow / 5xx | Grafana + Sentry (`requestId`) |

**GDPR:** `GET /me/privacy/export`, `POST /me/privacy/erase`.

## Pilot scope agreement (template)

> **In scope:** search, listing detail, enquiry (+ email), viewing booking,
> saved searches/alerts, seeker privacy area. Curated Milano pilot listings.
>
> **Out of scope for pilot:** owner mandate/checkout/e-sign, payments/fattura,
> AML (offline if a lead progresses). Full WP catalogue not loaded.
>
> **Support / duration / data:** [fill in]. Confirm mediation terms with counsel.
