# EasyCasa — Current State Audit

**Date:** 21 Jul 2026  
**API version:** Swagger 0.40.0  
**Git HEAD (at audit):** `16b6607`  
**Live:** https://easycasaita.com (`/api` → Nest API, Traefik strip)  
**VPS:** Hostinger `82.25.97.164` · `/opt/easycasa-ita`  
**Repo:** pnpm monorepo (Next.js web, NestJS API + Drizzle, FastAPI AI, Expo mobile, Vite admin)

> Not a formal pentest or legal opinion. Based on monorepo docs, `app.module.ts`, env examples, and deploy history through Phase 40.

---

## Executive verdict

**Backend and ops spine through Phase 40 are in-repo and deployed.**  
**Seeker pilot is NOT GO.** Blockers are operational/legal/auth — not missing Nest modules.

Do **not** onboard real seekers while `DEV_AUTH=true` on the VPS.

---

## Snapshot stats

| Metric | Value |
|--------|--------|
| API Swagger | 0.40.0 |
| Phase docs (`docs/phase-*.md`) | 43 |
| API unit tests (last full run) | 250+ |
| Live auth mode | `DEV_AUTH=true` (spoofable `x-dev-*` headers) |
| Edge | Traefik on shared VPS; Compose project `easycasa-ita` |

---

## Pilot go / no-go

| Criterion | Status |
|-----------|--------|
| API spine 32–40 in repo (Swagger 0.40.0) | Done |
| Live Traefik deploy on easycasaita.com | Done |
| Observability: `/metrics`, `/health/live`, `/health/ready`, throttling | Done |
| GDPR mechanics (consent, DSAR, erase, retention) | Code done — legal unsigned |
| Pilot preflight + smoke + seed CLIs (Phase 40) | Done |
| OIDC cutover (`DEV_AUTH=false` + live JWKS) | **Open — blocker** |
| Web / mobile seeker PKCE login | **Open — blocker** |
| Counsel / DPO sign-off on `docs/legal/*` | **Open — blocker** |
| Email transport + SPF/DKIM on staging | Verify |
| Backup-restore drill green on live staging | Verify |
| Client pilot scope agreement signed | **Open — blocker** |

---

## Findings (ranked)

### F1 — Critical — Auth
**Finding:** Production edge still runs `DEV_AUTH=true` — trusts spoofable `x-dev-user` / `x-dev-roles` / `x-dev-email`.  
**Impact:** Blocks real seeker pilot; Phase 40 preflight will NO-GO.  
**Next:** Stand up live Keycloak/OIDC; set `DEV_AUTH=false` + `OIDC_ISSUER` / `OIDC_AUDIENCE` / `OIDC_JWKS_URL`.

### F2 — Critical — Legal
**Finding:** Privacy / mediation docs are templates (`v1-draft`), not counsel-approved.  
**Impact:** GDPR Art. 7/13 risk if real PII is collected.  
**Next:** DPO/counsel review of `docs/legal/*` before opening pilot.

### F3 — High — Frontend auth
**Finding:** Seeker PKCE login not cut over on web / Expo.  
**Impact:** Privacy + Contatta paths incomplete for real users.  
**Next:** Wire OIDC PKCE clients; disable `VITE_DEV_AUTH` / Expo stubs.

### F4 — High — Ops
**Finding:** Backup-restore drill + Pushgateway freshness not confirmed on VPS.  
**Impact:** Stale-backup alerts may never fire; recovery unproven.  
**Next:** Cron `infra/backup-restore-drill.sh`; verify Prometheus rules scrape.

### F5 — Medium — Deploy
**Finding:** `deploy.sh` exits 2 when sourcing VPS `.env` (e.g. `NOTIFY_FROM=EasyCasa <…>` breaks shell).  
**Impact:** False deploy failure after healthy stack; CI/ops noise.  
**Next:** Quote `.env` values or source safely only for edge-check.

### F6 — Medium — Seams
**Finding:** PSP / SdI / RLI / AML / signature empty → DEV_AUTH stubs.  
**Impact:** OK for seeker-only pilot; not OK for owner transaction path.  
**Next:** Keep out of pilot scope; configure before production launch.

### F7 — Low — Docs / CI
**Finding:** README narrates through ~Phase 38; `deploy.yml` may still `cd /opt/easycasa`.  
**Impact:** Operator confusion / path drift.  
**Next:** Align docs + CI to `/opt/easycasa-ita`.

---

## Platform stack

| Layer | Stack |
|-------|--------|
| Web | Next.js 14, React 18, Tailwind, next-intl, MapLibre |
| API | NestJS 10, Drizzle + `pg`, Vitest, Swagger, jose, Stripe, Meili, S3/MinIO, throttler, Sentry, prom-client |
| AI | FastAPI — embeddings / NLQ / valuation |
| Admin | Vite + React SPA |
| Mobile | Expo 51 / expo-router |
| Data | Postgres 16 + PostGIS + pgvector, Redis 7, Meilisearch, MinIO |
| Deploy | Docker Compose + Traefik (`root_default`); optional Caddy profile |

Public routes: `/` → web · `/api` → api (strip) · `/ai` → ai · `admin.easycasaita.com` → admin.

---

## API module map (`apps/api/src/app.module.ts`)

| Layer | Modules |
|-------|---------|
| Platform | Config, Seams, Db, Auth, Email, Observability, Privacy.forRootProduction, Users, Notifications |
| Discovery | Listings, Taxonomy, Media, Search, SavedSearches, Alerts |
| Marketplace | Partners, Messaging, Billing, Featured, Admin |
| Transaction | ServiceCatalog, Properties, Fascicolo, Orders, Mandate, Professionals, Assignments, ProfessionalMe, Rentals, Aml |
| Money | Payments, Invoicing |
| Pilot funnel | Enquiries, Avm, Viewings, Pilot |

Root controllers: `HealthController`, `ReadinessController` (+ Postgres / Meili / Redis indicators).

---

## Observability & safety (Phase 39)

- `GET /metrics` (Prometheus, `@Public`)
- `GET /health` (seam snapshot)
- `GET /health/live` (process up)
- `GET /health/ready` (503 if Postgres/Meili/(optional Redis) down)
- Throttling: 120/min default; enquiry + AVM 10/min
- Request-id middleware; CSP report sink; Sentry if `SENTRY_DSN` set
- Backup drill: `infra/backup-restore-drill.sh` + freshness alert rules

---

## Privacy / GDPR (Phase 38 — code shipped)

- Consent ledger (`consent_records`)
- `GET /me/privacy/export`, `POST /me/privacy/erase`, `POST /me/privacy/consents`, `GET /me/privacy/policy-version` (`v1-draft`)
- Enquiry gate requires privacy + mediation consents
- Retention purge (`RETENTION_LEAD_DAYS`, default 90)
- Web Contatta checkboxes + privacy UI + short legal pages
- **Open:** counsel/DPO approval; cookie banner

---

## Pilot tooling (Phase 40)

```bash
# Seed Milano pilot listings
pnpm --filter @easycasa/api build
pnpm --filter @easycasa/api pilot:seed
# or: POST /admin/pilot/seed (admin role)

# Live smoke against staging
BASE_URL=https://easycasaita.com/api SMOKE_TARGET=live \
  SMOKE_DEV_USER=smoke-seeker \
  pnpm --filter @easycasa/api pilot:smoke
```

Preflight checks (blockers): `DEV_AUTH` off, OIDC set, email transport, `/health/ready` green, listings seeded. Missing `SENTRY_DSN` = warning only.

---

## Phase bands (doc count)

| Band | Approx. docs |
|------|----------------|
| Foundations 0–6 | 7 |
| Product 7–31 | 25 |
| Platform 32–36.1 | 6 |
| Pilot 37–40 (+ 39.1) | 5 |

Highest landed: **Phase 40** (pilot readiness tooling). Consolidations: **36.1**, **39.1**.

---

## Auth model

| Mode | Behavior |
|------|----------|
| `DEV_AUTH=true` | Trusts `x-dev-*` headers (current VPS default) |
| `DEV_AUTH=false` | Requires `OIDC_ISSUER`, `OIDC_AUDIENCE`, `OIDC_JWKS_URL` (jose JWKS verify) |

Local Keycloak overlay exists; production IdP + web/mobile PKCE **not cut over**.

---

## CI / workflows (`.github/workflows`)

| Workflow | Role |
|----------|------|
| `ci.yml` | lint, typecheck, test, build + AI pytest |
| `api-boot.yml` | Composition-root boot-check |
| `api-integration.yml` | testcontainers Postgres+Meili |
| `api-consolidation.yml` | no-process-env + full API tests |
| `deploy.yml` | SSH deploy on `main` |
| `mobile-ci.yml` | Expo / api-client |
| `a11y-webvitals.yml` | pa11y + Lighthouse |
| `security.yml` | gitleaks, dep audit, CodeQL |

---

## Recommended sequence to open pilot

1. **Unblock auth** — Live OIDC realm; `DEV_AUTH=false`; web + mobile PKCE; re-run Phase 40 preflight.
2. **Legal gate** — Counsel/DPO approve `docs/legal/*`; bump policy version past `v1-draft`; cookie banner if needed.
3. **Ops proof** — Seed Milano listings; live smoke; schedule backup-restore-drill; fix `.env` quoting for clean `deploy.sh`.
4. **Open pilot** — Sign client scope (search → enquiry → viewing only); monitor Sentry + Grafana 72h.

---

## Explicitly out of pilot scope

- Owner mandate / checkout / e-signature  
- Payments / fattura elettronica  
- Online AML  
- Full WordPress catalogue ETL  
- Production pentest / full GDPR certification  

---

## Quick context for Claude (paste this block)

```
EasyCasa Ita = Italian real-estate marketplace monorepo.
Live: easycasaita.com on Hostinger VPS via Traefik + Docker Compose.
Stack: Next.js web, NestJS+Drizzle API (Swagger 0.40.0), FastAPI AI, Expo mobile.
Phases 0–40 landed in code. Pilot readiness tooling exists (preflight/smoke/seed).
BLOCKERS for seeker pilot: DEV_AUTH=true on VPS, no live OIDC/PKCE, legal templates unsigned, backup drill not proven on staging.
Seeker path in scope: search → listing → enquiry (+email) → viewing → privacy export/erase.
Out of pilot: owner transaction, payments, AML, full WP migration.
Repo path pattern: /Volumes/Muba/Easy Casa Platform ; VPS /opt/easycasa-ita.
Prefer Drizzle not Prisma; no Nest globalPrefix('api') — Traefik strips /api.
```
