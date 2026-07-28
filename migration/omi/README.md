# Phase 27.1 — OMI seed & AVM activation (2025/2)

Load-ready Agenzia delle Entrate – OMI quotations for EasyCasa’s property valuation
band (`DrizzleOmiPort` / listing valuation UI).

**Attribution (mandatory):** Fonte: Agenzia delle Entrate – OMI

## What’s here

| File | Role |
|------|------|
| `import_omi.py` | Re-import from Entratel `QI_*_VALORI` + `QI_*_ZONE` CSVs |
| `load.sql` | `\copy` upsert into `omi_zone_quotes` + derived `omi_quotes` |
| `verify.sql` | National pass/fail checks (run after load) |
| `fixtures/` | Lombardia slice for CI (`omi-load` workflow) |

**National CSVs are not in git.** Retrieve `omi_quotes.csv.gz` and
`omi_zone_quotes.csv.gz` from MinIO (see [`docs/omi-import.md`](../../docs/omi-import.md)).

Schema migration: `migration/sql/0031_omi_zone_quotes.sql`.

## Activate on a database

```bash
pnpm --filter @easycasa/migration migrate

cd migration/omi
# fetch gz from MinIO first (see docs/omi-import.md)
gunzip -k -f omi_quotes.csv.gz omi_zone_quotes.csv.gz
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f load.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f verify.sql
```

`load.sql` normalizes `2025S2` → `2025-H2` and uppercases comune/provincia.
Idempotent upsert — safe to re-run; does not truncate microzone rows.

## Refresh from a new Entratel export

```bash
python3 import_omi.py --valori … --zone … --out ./out
gzip -kf ./out/omi_quotes.csv ./out/omi_zone_quotes.csv
# upload gz to MinIO, then load + verify
```

Do **not** commit raw Entratel dumps or the national derived gz files.

## Follow-on

Zone polygons / Geopoi → `omi_zone_quotes.geom` + `DrizzleOmiPort` preference.
