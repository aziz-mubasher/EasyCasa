# Phase 1 — Data Backbone & WordPress Migration (checklist)

Goal: clean, geocoded, enriched data from the current WordPress site living in
PostgreSQL on staging, plus the redirect map for cutover.

## Order of operations
```bash
# 0. Audit the WP install first (critical) — see docs/wp-audit.md
#    then update migration/src/etl/meta-map.ts + .env (WP_LISTING_POST_TYPE, WP_PERMALINK_BASE)

pnpm --filter @easycasa/migration migrate     # create schema + extensions + seed
pnpm --filter @easycasa/migration etl         # WP MySQL -> Postgres (idempotent)
pnpm --filter @easycasa/migration geocode     # fill coordinates via Nominatim (cached)
pnpm --filter @easycasa/migration media       # images -> MinIO (WebP + blur placeholder)
pnpm --filter @easycasa/migration reconcile   # counts WP vs PG, writes out/reconcile-report.md
pnpm --filter @easycasa/migration redirects   # builds out/redirects.csv + .caddy
```

## Steps & acceptance criteria
- [ ] **1. Export WP DB + uploads.** Done when: a dump loads into local `wp-mysql` (see `infra/docker-compose.migration.yml`) or the ETL can reach the live DB read-only.
- [ ] **2. Audit the WP install.** Done when: `meta-map.ts`, `WP_LISTING_POST_TYPE`, and `WP_PERMALINK_BASE` reflect reality (docs/wp-audit.md).
- [ ] **3. Schema + extensions.** Done when: `migrate` applies 0001–0003, PostGIS + pgvector enabled, categories + 20 regions seeded.
- [ ] **4. ETL.** Done when: `etl` upserts users, listings, and content; re-running changes nothing (idempotent).
- [ ] **5. Geocoding.** Done when: listings with an address have `location` set; `geocode` respects the 1 req/s limit and caches.
- [ ] **6. Media.** Done when: gallery images are in MinIO as WebP with placeholders and `media` rows exist.
- [ ] **7. Reconciliation.** Done when: `reconcile` passes (critical counts match) and `out/reconcile-report.md` is reviewed.
- [ ] **8. Redirect map.** Done when: `out/redirects.csv` + `.caddy` are generated and spot-checked.

## Cursor prompts (one PR each)
1. "Read docs/wp-audit.md. Add an `audit` script to the migration package that runs the discovery SQL and prints the top 50 meta_keys and all post_types/taxonomies."
2. "Extend the ETL to populate `category_id` and `region_id` by joining wp_term_relationships/wp_term_taxonomy, matching to seeded categories/regions by slug."
3. "Add a Vitest suite for `transform.ts` covering price/number parsing and transaction normalization edge cases."
4. "Add a `verify-geo` script that reports how many listings fall outside Italy's bounding box (data-quality check)."

## Guardrails
- ETL/reconcile connect to WordPress **read-only**. Never write to the WP DB.
- All loads are `ON CONFLICT ... DO UPDATE` — keep it that way.
- Do not commit `.env`, dumps, or `migration/out/*` (git-ignored).
