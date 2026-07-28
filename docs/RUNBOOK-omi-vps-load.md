# RUNBOOK — OMI national load on VPS

**Blocked until EC-2 rehearsal green** — see [`ec-2-omi-load-rehearsal.md`](./ec-2-omi-load-rehearsal.md).

## Expectation (from rehearsal)

- Migrate empty DB: ~5 s (already-migrated prod: skip or apply pending only)
- `load.sql` national seed: ~7–15 s (network/disk may add time for MinIO fetch + gunzip)
- On-disk OMI tables+indexes: ~**113 MB**
- Rows: 157,266 zone + 29,655 comune

## Steps

1. Fetch national seed from MinIO (not in git):

```bash
# Example — adjust bucket/prefix after ops places the objects:
mc cp easycasa/omi/2025-H2/omi_zone_quotes.csv.gz migration/omi/
mc cp easycasa/omi/2025-H2/omi_quotes.csv.gz migration/omi/
```

2. Ensure schema through `0031` (and later) is applied:

```bash
pnpm --filter @easycasa/migration migrate
```

3. Load:

```bash
cd migration/omi
gunzip -k -f omi_quotes.csv.gz omi_zone_quotes.csv.gz
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f load.sql
```

4. Verify:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f verify.sql
```

5. Re-run `load.sql` is safe (upsert). Do **not** truncate `omi_quotes` — microzone rows from `0026` / `omi:import` must survive.

## Out of scope here

Zone polygons / Geopoi. AVM / `OmiPort` changes.
