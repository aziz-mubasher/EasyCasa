# Phase 2 — Core API (checklist)

Goal: the typed API every client uses — auth/roles, listings (with geo search),
taxonomy, users/favorites/saved-searches, media uploads, admin.

## Run
```bash
pnpm --filter @easycasa/migration migrate   # ensure 0004_phase2 applied
pnpm --filter @easycasa/api start:dev        # or via docker compose
# Swagger: http://localhost/api/docs
```

## Steps & acceptance criteria
- [x] **1. Auth & roles.** Done when: protected routes reject anonymous calls; `@Roles` enforced; `DEV_AUTH` works locally; OIDC verifies real tokens.
- [x] **2. Listings.** Done when: create/update/publish + search with filters and geo bounds work; ownership enforced.
- [x] **3. Taxonomy.** Done when: `/categories` and `/regions` return seeded data.
- [x] **4. Users/memberships.** Done when: `/me` auto-provisions; favorites + saved searches persist per user.
- [x] **5. Media.** Done when: presign→PUT→confirm inserts media and cover image shows in search results.
- [x] **6. API contract.** Done when: Swagger at `/docs`; shared DTO types consumed by the web app.
- [x] **7. Admin.** Done when: admin-only stats + archive; non-admins forbidden.
- [x] **8. Tests.** Done when: `pnpm --filter @easycasa/api test` green (services + guards).

## Verified in this scaffold
- `pnpm --filter @easycasa/api typecheck` ✅
- `pnpm --filter @easycasa/api test` ✅ (8 tests: listings service, roles guard, health)
- SQL `0004_phase2.sql` parses against Postgres grammar ✅

## Cursor prompts (one PR each)
1. "Add class-validator to the saved-search POST body (name required, query is an object) and cover it with a DTO + test."
2. "Add a GET /listings/:slug media list to the detail response by joining media ordered by position."
3. "Wire real Keycloak: add a docker-compose.auth.yml with Keycloak, a realm export with the six roles, and document token retrieval."
4. "Add integration tests using testcontainers (Postgres+PostGIS+pgvector) that run migrations then exercise /listings search including geo bounds."
5. "Build a minimal Next.js admin page (/admin) that calls /admin/stats and lists draft listings with an archive button (admin role only)."

## Guardrails
- Controllers thin; logic in services; geo/vector via raw SQL in repositories.
- Every new route ships a DTO (validation) and a test.
- Mutations are role-guarded; ownership checked in services.
