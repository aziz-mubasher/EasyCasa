# Phase 27.1 — OMI seed & AVM activation (2025/2)

Load-ready Agenzia delle Entrate – OMI quotations for EasyCasa’s property valuation
band (`DrizzleOmiPort` / listing valuation UI).

**Attribution (mandatory):** Fonte: Agenzia delle Entrate – OMI

## What’s here

| File | Role |
|------|------|
| `import_omi.py` | Re-import from Entratel `QI_*_VALORI` + `QI_*_ZONE` CSVs |
| `load.sql` | `\copy` upsert into `omi_zone_quotes` + derived `omi_quotes` |
| `omi_quotes.csv.gz` | ~29k comune-level medians (`basis=zone_median`) |
| `omi_zone_quotes.csv.gz` | ~157k zone-level bands (source of truth) |

Schema migration lives at `migration/sql/0031_omi_zone_quotes.sql` (not a second
`0018` — that number is already Phase 29 in this repo).

## Activate on a database

From the monorepo root (VPS or local with `DATABASE_URL`):

```bash
# 1. Schema
pnpm --filter @easycasa/migration migrate
# or: psql "$DATABASE_URL" -f migration/sql/0031_omi_zone_quotes.sql

# 2. Unpack + load (cwd must be this folder for \copy paths)
cd migration/omi
gunzip -k -f omi_quotes.csv.gz omi_zone_quotes.csv.gz
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f load.sql
```

`load.sql` normalizes seed periods `2025S2` → `2025-H2` and uppercases comune /
provincia so they match `normalizeOmiComune` / `normalizeProvinceSlug`.

Derived `omi_quotes` rows use natural-key defaults
`(omi_zone='', stato='', cod_tip=0, geo_level=comune)` so they coexist with
microzone rows from `pnpm --filter @easycasa/api omi:import`.

No Nest API change is required for comune-level blending: once `omi_quotes` is
populated, `POST /avm/estimate` and the listing valuation band start returning
OMI bands for covered comuni.

## Refresh from a new Entratel export

```bash
python3 import_omi.py \
  --valori /path/to/QI_*_VALORI.csv \
  --zone   /path/to/QI_*_ZONE.csv \
  --out    ./out
gzip -kf ./out/omi_quotes.csv ./out/omi_zone_quotes.csv
# copy gz here, then re-run load.sql
```

Do **not** commit raw Entratel ZIP/CSV source dumps. The compressed derived
load files in this folder are intentional seed artifacts.

## Follow-on (not in this drop)

Point-in-polygon zone lookup needs Geopoi / open-licence perimeters in
`omi_zone_quotes.geom` (or `omi_zone_polygons`) and a small change to
`DrizzleOmiPort` to prefer the matched zone over the comune median.
