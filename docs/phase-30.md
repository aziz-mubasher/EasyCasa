# Phase 30 — Productionization (foundation)

**Goal:** turn the feature stack into something that boots, deploys, and can be operated. This phase documents the **runtime foundation** and ops surface for *this* monorepo (Drizzle + Docker Compose + Traefik/Caddy) — not a Prisma/Keycloak rewrite of a sandbox scaffold.

---

## What already exists (do not replace)

| Area | Repo reality |
|------|----------------|
| Schema | **Drizzle** + `migration/sql/0001…0018_*.sql` (not Prisma) |
| Compose | `infra/docker-compose.yml` project **`easycasa-ita`** + Traefik overlay |
| Config | `apps/api/src/config.ts` — zod, `DEV_AUTH` + OIDC fail-fast |
| Composition root | `apps/api/src/app.module.ts` — all phase modules imported |
| CI | `.github/workflows/ci.yml` — lint / typecheck / test / build + AI pytest |
| Dockerfiles | `apps/api`, `apps/web`, `apps/admin`, `services/ai` |

---

## What Phase 30 adds

```
Makefile                              # up / down / logs / migrate / reindex / psql / fresh / keycloak
infra/docker-compose.keycloak.yml     # optional local OIDC (not for VPS Traefik)
docs/phase-30.md                      # this runbook + backlog
.env.example / docs/env.md            # notification seam vars enumerated
apps/api/src/config.ts                # PUSH_/EMAIL_PROVIDER_* optional seams
```

### Local ops

```bash
cp .env.example .env
make up                 # backing services + apps
make migrate            # SQL migrations via @easycasa/migration
make reindex            # Meilisearch listings backfill
make keycloak           # optional: Keycloak on :8080 for OIDC experiments
```

VPS continues: rsync → migrate → `docker compose … up -d --build` (see prior phases / `docs/vps-setup.md`).

---

## Productionization backlog (ordered)

Adapted from the scaffold; mapped to this codebase:

1. **OIDC cutover** — leave `DEV_AUTH=true` only until Keycloak (or other) realm is live; set `OIDC_ISSUER` / `AUDIENCE` / `JWKS_URL`; script realm export/import.
2. **Order bridge** — Phase 26 adapter is live; buyer party columns / fascicolo branching still optional follow-ups.
3. **Viewings hardening** — Phase 29 has partial unique index; add IANA timezone per listing + Europe/Rome wall-clock.
4. **External credentials** — wire fail-soft seams: PSP, SdI, AML, RLI/Entratel, e-signature, push/email (`PUSH_PROVIDER_URL` / `EMAIL_PROVIDER_URL` / `SMTP_URL`), S3 lifecycle.
5. **Data loads** — OMI quotazioni (Phase 27), sold-price comps, geocoding.
6. **Search ops** — Meilisearch settings + scheduled reindex; rate-limit public search + AVM.
7. **Observability** — structured logs, error tracking, readiness probes, backups, secrets (not `.env` in prod), CORS/HTTPS headers (Traefik already partially covers edge).

---

## Caveats

- Scaffold Prisma/`CatalogModule` paths were **not** adopted — they would break the live tree.
- Do not migrate any Prisma stub schema into production Postgres.
- Not legal/tax/security sign-off (SdI, AML, GDPR on enquiries/valuation leads).

---

## Product status

Feature-complete across the core spine (P8–18), discovery (P20–23), enquiry→order (P24–26), AVM (P27), messaging (P28), viewings (P29). Phase 30 starts treating that as an operable deployable system.
