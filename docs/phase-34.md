# Phase 34 — Real Boot + Integration Tests

**Goal:** turn P32/P33 “boots in a sandbox” into **runs end-to-end over a real
database in CI.** (1) merge-and-boot runbook for staging; (2) testcontainers
suite that boots the real `AppModule`, applies real migrations, and drives real
routes.

---

## Part 1 — Merge & boot (runbook)

P32 + P33 are already on `main`. Prove the real app boots:

```bash
pnpm --filter @easycasa/api build
set -a; . ./.env.test; set +a
node apps/api/dist/scripts/boot-check.js        # BOOT OK

make up
make migrate                                     # @easycasa/migration → 0001…0019
make reindex

curl -fsS https://easycasaita.com/api/health | jq   # {status:"ok", seams:[…]}
# Local without Traefik strip: http://localhost:4000/health
```

| Symptom | Likely cause | Caught by |
| --- | --- | --- |
| Nest can't resolve dependencies | provider not exported | boot-check (P33) |
| Invalid configuration / OIDC | env missing when `DEV_AUTH` off | `loadApiConfig` |
| 500 on a feature route, 200 on `/health` | feature wiring | integration suite |
| migration error | SQL / extension | `make migrate` / harness |

---

## Part 2 — Integration suite

```
apps/api/test/integration/
  harness.ts            # PostGIS+pgvector + Meili → migrate → real AppModule → TestAuthGuard
  app-under-test.ts     # re-exports AppModule + JwtAuthGuard
  test-auth.ts          # x-test-user stub (respects @Public → 401 on guarded)
  *.int.spec.ts         # /health, /search/bounds, /me/enquiries
apps/api/vitest.integration.config.ts
.github/workflows/api-integration.yml
```

### Adaptations vs sandbox scaffold

- **No Nest `setGlobalPrefix('api')`** — Traefik strips `/api`; tests hit `/health`, `/search/bounds`, `/me/enquiries`.
- **`JwtAuthGuard` path** — `auth/jwt.guard.ts` (not `jwt-auth.guard.ts`).
- **pgvector** — install into `postgis/postgis:16-3.4` at harness start (same as `infra/postgres/Dockerfile`).
- **Meilisearch** — started alongside Postgres so map search is reachable.
- **Lazy Drizzle pool** — `getDb()` / `resetDbConnection()` so `DATABASE_URL` can be set after import.
- **`TestAuthGuard`** — respects `@Public()`, throws `UnauthorizedException` (401), uses `AuthUser` / `UserRole`.
- **Bounds DTO** — requires `zoom` (scaffold body was incomplete).

### Auth in tests

```ts
.set(asUser({ sub: 'u1', email: 'u@example.it', roles: ['buyer'] }))
```

### Run

```bash
pnpm --filter @easycasa/api test:int
# Without Docker: TestAuthGuard unit tests pass; *.int.spec.ts self-skip
```

---

## Follow-ups

1. Seed fixtures for pilot paths (enquiry → viewing / list → order).
2. Make `api-integration` a required GitHub check on `main`.
3. Optional: shared globalSetup to avoid refcounted stop across files.
