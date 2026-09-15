# EC-SELL-PRIVATELY-1 — published listings without energy figures

**Date:** 2026-09-15  
**Kind:** count only. No UPDATE, no unpublish, no backfill.  
**Decision (AZM):** spegnere / backfill / accettare — still open (§11.1).

## Query

`scripts/count-published-energy-gap.sql`  
Runner: `node scripts/count-published-energy-gap.mjs` (needs `DATABASE_URL`; exits 0 without executing if unset).

A listing is “missing energy figures” when `status = 'published'` and **either** `energy_class` is null/blank **or** `energy_performance_kwh_m2_y` is null.  
`[[BUCO: elenco cause di esenzione APE]]` — this count does not treat `NULL` as an exemption.

## Result this session

This cloud agent has **no production database**. The query was **not executed** against `easycasa-ita-db-1`. No listing row was read or written.

## Last known figures (do not treat as this PR’s count)

| Source | Date | Published | Missing |
|---|---|---:|---:|
| Brief EC-SELL-PRIVATELY-1 | 2026-09-15 | 118 | 92 without class **and** index |
| `docs/legal/AYNI_STATE_AUDIT.md` | 2026-09-07 | 118 | 118 without `energy_performance_kwh_m2_y` |
| `verified_owner_case` close-out | 2026-08-15 | — | **0** rows |

Re-run the SQL on the VPS and replace this section with the live numbers before deciding spegnere / backfill / accettare.
