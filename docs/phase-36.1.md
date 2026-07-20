# Phase 36.1 — Consolidation of Phases 32–36

**Goal:** prove 32–36 is one coherent, bootable tree before the Phase 37 pilot
flow. Resolve supersessions, wire the shared infra spine, run suites together.

---

## Already in this monorepo (authoritative)

| Concern | Location |
| --- | --- |
| Config + seams | `config/load.ts`, `ConfigModule`, `SeamsModule` (P33) |
| Auth | `JwtVerifier`, `JwtAuthGuard`, Keycloak realm (P35) |
| Email | `EmailModule` + templates (P36, landed with 36.1) |
| Health `@Public` | already annotated (P33) — consolidation finding was pre-empted |
| Integration boot | `test:int` / `api-integration.yml` (P34) |
| Headless boot | `scripts/boot-check.ts` / `api-boot.yml` (P33) |

### Not adopted from sandbox

- Replacing our `AppModule` with scaffold's shorter module list / AppModule `APP_GUARD`.
- Scaffold `OIDC_JWKS_URI` / `MEILI_HOST` / `PORT` — keep real var names.
- `EMAIL_FROM` — use existing `NOTIFY_FROM`.

---

## What 36.1 adds

```
apps/api/src/email/**                 # port, providers, templates, EmailService
apps/api/src/consolidation.boot.ts    # spine-only Nest module for e2e
apps/api/src/consolidation.e2e.spec.ts
apps/api/scripts/check-no-process-env.sh
.github/workflows/api-consolidation.yml
docs/phase-36.1.md
```

`AppModule` imports `EmailModule` after `AuthModule`.

---

## Gate to Phase 37

```bash
bash apps/api/scripts/check-no-process-env.sh apps/api/src
pnpm --filter @easycasa/api build && node apps/api/dist/scripts/boot-check.js
pnpm --filter @easycasa/api test
pnpm --filter @easycasa/api test:int   # needs Docker
```

---

## Consolidation finding

Sandbox: `/health` missing `@Public` after merge → 401. **This tree already had
`@Public` on health**; consolidation e2e asserts it stays public.
