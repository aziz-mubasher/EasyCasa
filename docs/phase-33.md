# Phase 33 — Config as injectable + CI boot gate

**Goal:** close Phase 32 follow-ups — (1) surface validated config into Nest DI so seams inject it; (2) add a headless `app.init()` CI gate against the real `AppModule`.

---

## What this monorepo ships

```
apps/api/src/config/load.ts                 # zod schema (DEV_AUTH + real var names)
apps/api/src/config/index.ts                # re-exports
apps/api/src/config/config.module.ts        # @Global APP_CONFIG
apps/api/src/config/inject-config.decorator.ts
apps/api/src/config/adapters/*              # psp/sdi/aml/rli/signature/notifications/meili
apps/api/src/health/health.controller.ts    # /health includes seams[]
apps/api/src/scripts/boot-check.ts          # headless Nest boot
.github/workflows/api-boot.yml
.env.test                                   # DEV_AUTH=true minimal env for the gate
```

### Not adopted from the sandbox

- Scaffold `OIDC_JWKS_URI` / `MEILI_HOST` / always-required OIDC — we keep `OIDC_JWKS_URL`, `MEILI_URL`, `DEV_AUTH`.
- Replacing existing PSP/SdI HTTP providers wholesale — status adapters are wired; richer providers still use `apiConfig` (proxied) and can migrate to `@InjectConfig()` module-by-module.

---

## Pattern

```ts
@Global()
@Module({
  providers: [{ provide: APP_CONFIG, useFactory: () => loadApiConfig() }],
  exports: [APP_CONFIG],
})
export class ConfigModule {}

constructor(@InjectConfig() private readonly config: ApiConfig) {}
```

`/health` returns `{ status, service, time, seams: SeamStatus[] }`.

---

## CI

```bash
pnpm --filter @easycasa/shared build && pnpm --filter @easycasa/api build
set -a && . ./.env.test && set +a
node apps/api/dist/scripts/boot-check.js
# → BOOT OK — DI graph resolved; /health registered
```

No Postgres/Meili required: DB-backed `onModuleInit` hooks (credential policy, pricing legal basis) and Meili settings fail soft with a warn, matching production resilience when a dependency is briefly down.

---

## Follow-ups

1. Inject seam adapters into payments/invoicing/aml/rentals/mandate/search and drop remaining `apiConfig` singleton reads where safe.
2. Surface `seams` on Grafana/Uptime.
3. Grep for leftover `process.env.` outside `config/load.ts` + `boot-check.ts`.
