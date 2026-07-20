# Phase 32 — Composition-root reconciliation

**Goal:** Phase 30 backlog — confirm the Nest composition root boots with every real feature module, correct class names/paths, and config variable names that match what the code reads.

---

## Repo reality (already true before this phase)

Unlike the sandbox scaffold (Phases 8–15 only + wrong guesses like `CatalogModule` / `OIDC_JWKS_URI` / `STORAGE_*`), **this monorepo already wired the full spine through Viewings** and keeps:

| Concern | This repo |
|---------|-----------|
| Composition root | `apps/api/src/app.module.ts` — all live modules |
| Global guards | `AuthModule` (`JwtAuthGuard` + `RolesGuard` as `APP_GUARD`) |
| Config | `apps/api/src/config.ts` — `DEV_AUTH` + `OIDC_JWKS_URL`, `MEILI_URL`, `S3_*` / `MINIO_*` |
| HTTP prefix | Traefik strips `/api`; Nest does **not** set `setGlobalPrefix('api')` |
| DB | `DbModule` (Drizzle) — required; absent from the scaffold |

Scaffold modules that **do not exist** here (do not invent them): `CatalogAdminModule`, `AdminListsModule`, `DevicesModule`, `UploadsModule` as Nest modules. Admin lives in `AdminModule`; uploads helpers under `uploads/domain` + `MediaModule`.

---

## What Phase 32 adds

```
docs/phase-32.md              # this inventory + caveats
apps/api/src/app.module.ts    # grouped imports + Phase 32 comment (same modules)
apps/api/src/app.module.spec.ts  # static composition-root regression tests
```

### Module inventory (composition root)

Platform: `DbModule`, `AuthModule`, `UsersModule`, `NotificationsModule`  
Discovery: `ListingsModule`, `TaxonomyModule`, `MediaModule`, `SearchModule`, `SavedSearchesModule`, `AlertsModule`  
Marketplace: `PartnersModule`, `MessagingModule`, `BillingModule`, `FeaturedModule`, `AdminModule`  
Spine: `ServiceCatalogModule`, `PropertiesModule`, `FascicoloModule`, `OrdersModule`, `MandateModule`, `ProfessionalsModule`, `AssignmentsModule`, `ProfessionalMeModule`, `RentalsModule`, `AmlModule`  
P17: `PaymentsModule`, `InvoicingModule`  
Funnel+: `EnquiriesModule`, `AvmModule`, `ViewingsModule`

### Config names (do not “reconcile” to the scaffold)

Verified against `apiConfig` / guard usage:

| Code reads | Scaffold wrongly used |
|------------|------------------------|
| `OIDC_JWKS_URL` | `OIDC_JWKS_URI` |
| `MEILI_URL` / `MEILI_MASTER_KEY` | `MEILI_HOST` / `MEILI_API_KEY` |
| `S3_ENDPOINT` + `MINIO_*` | `STORAGE_*` |
| `API_PORT` + `DEV_AUTH` | `PORT` + always-required OIDC |

---

## Validation

- [x] Static composition tests (`app.module.spec.ts`) — import set exact, no AppModule `APP_GUARD`, `OrdersModule` exports `OrdersService`
- [x] Live VPS already boots (`GET /api/health`) through Phase 31

---

## Follow-ups (optional)

1. ~~Nest `AppConfig` provider injection~~ — done in Phase 33 (`ConfigModule` + seam adapters).
2. ~~Headless `NestFactory.create(AppModule).init()` in CI~~ — done in Phase 33 (`boot-check` + `api-boot` workflow; no Postgres required for DI init).
3. OIDC cutover — still Phase 30 backlog #1 (`DEV_AUTH=true` until then).

---

## Not adopted

- Scaffold `app.module.ts` that drops `DbModule` / marketplace modules and re-registers guards.
- Scaffold `config/config.ts` that breaks `DEV_AUTH` and renames Meili/S3/OIDC vars.
- Scaffold `main.ts` `setGlobalPrefix('api')` (would double-prefix behind Traefik).
