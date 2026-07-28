# EC-2 — OMI load rehearsal results

**Date:** 2026-07-28  
**Environment:** throwaway Postgres (EasyCasa `easycasa-ita-db` image = PostGIS 16 + pgvector), **not** production `easycasa` DB. Local Mac had no Docker; rehearsal used an isolated container on the VPS host.

## Step 0 notes

- Latest migrations include `0031_omi_zone_quotes.sql` and `0032_…` (EC-1). Rehearsal applied **all** through `0032`.
- Compose lives under `infra/docker-compose.yml` (not repo-root `docker-compose*.yml`).
- Seed period in CSVs is `2025S2`; `load.sql` normalizes to **`2025-H2`**.

## Part 1 — timings & sizes

| Step | Wall-clock |
|------|------------|
| Migrations 0001→0032 (empty DB) | **5 s** |
| First `load.sql` | **7 s** |
| Second `load.sql` (idempotent) | **7 s** |

| Relation | `pg_total_relation_size` |
|----------|--------------------------|
| `omi_zone_quotes` | **94 MB** (98,590,720 B) |
| `omi_quotes` | **19 MB** (19,652,608 B) |
| **Total** | **113 MB** |

VPS headroom: trivial vs typical disk; national load is ~2 minutes of ops budget including unpack.

## Row counts

| Table | Expected | Actual |
|-------|----------|--------|
| `omi_zone_quotes` | 157,266 | **157,266** |
| `omi_quotes` | 29,655 | **29,655** |

## Part 2 — idempotency

Second `load.sql`: committed, no duplicate-key errors, counts unchanged, Milano B12 `sale_min/max` still 870000/1090000.

## Part 3 — verify.sql

All 12 national checks **PASS** (including ORDONA null-istat and Milano smoke tests). Period expectation is `2025-H2` (post-normalize).
