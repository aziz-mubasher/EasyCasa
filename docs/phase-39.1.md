# Phase 39.1 — Consolidation of Phases 37–39 (full spine 32–39)

**Goal:** before pilot readiness (40), prove the pilot backend (37), GDPR
mechanics (38), and observability/safety (39) merge cleanly onto the 36.1 base
and that the **entire infrastructure spine (32–39) boots as one DI graph**.

## Landed in this repo

| Finding (sandbox) | Status here |
| --- | --- |
| Privacy cross-module `PERSONAL_DATA_SOURCE` scope | Fixed via `PrivacyModule.forRoot` (+ existing `PersonalDataRegistry`) |
| `ConsentStore` / `RetentionSink` missing DI tokens | Already fixed in P38 (`CONSENT_STORE` / `RETENTION_SINK`) |
| Readiness + indicators in different scopes | **Fixed:** `ReadinessController` + indicators on `AppModule` |
| `/metrics` unmarked → 401 under JWT | Already `@Public` in P39 |

```
apps/api/src/privacy/privacy.module.ts     # forRoot + forRootProduction
apps/api/src/observability/observability.module.ts  # readiness moved out
apps/api/src/app.module.ts                 # forRootProduction + readiness providers
apps/api/src/consolidation.boot.ts         # full spine with stubs
apps/api/src/consolidation.e2e.spec.ts     # 32–39 pipeline assertions
docs/phase-39.1.md
```

### Adaptations vs scaffold

- Keep `PersonalDataRegistry` (no Nest `multi` — same Phase 38 lesson).
- Auth guards stay on `AuthModule` only (not AppModule).
- No Nest `/api` prefix; real env names (`OIDC_JWKS_URL`, `NOTIFY_FROM`, …).
- Consolidation uses stub `UsersService` + memory consent/retention (no Docker).

## Validation

```bash
bash apps/api/scripts/check-no-process-env.sh apps/api/src
npx pnpm@9.12.0 --filter @easycasa/api typecheck
npx pnpm@9.12.0 --filter @easycasa/api test
```

## Gate to Phase 40

`boot-check` green on real `AppModule`; consolidation e2e green; `test:int` (34)
when Docker available. Then Phase 40 (pilot readiness) has a proven foundation.
