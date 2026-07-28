# RUNBOOK — OMI national load on VPS

**Status (2026-07-28):** Production already had the national H2 2025 seed
loaded (`157266` zone / `29655` comune). EC-2 was merged; this runbook was
executed as **verify + backup + AVM smoke + restore drill**, not a fresh load.

## Expectation (from EC-2 rehearsal)

- Migrate empty DB: ~5 s (prod already through `0032`)
- `load.sql` national seed: ~7–15 s
- On-disk OMI tables+indexes (rehearsal): ~**113 MB**; prod observed ~**67 MB**
  (`omi_zone_quotes` 55 MB + `omi_quotes` 12 MB) after live vacuum/packing
- Rows: 157,266 zone + 29,655 comune

## Production paths

- Repo on VPS: `/opt/easycasa-ita` (not `/srv/easycasa`)
- Postgres via Compose service `db` (`easycasa` / `easycasa`)
- National CSVs are **not** in git — MinIO or local gz; prod was already seeded

## Steps (when loading a new semester)

1. Fetch national seed from MinIO (not in git):

```bash
# Example — adjust bucket/prefix after ops places the objects:
mc cp easycasa/omi/2025-H2/omi_zone_quotes.csv.gz migration/omi/
mc cp easycasa/omi/2025-H2/omi_quotes.csv.gz migration/omi/
```

2. Backup and prove size:

```bash
cd /opt/easycasa-ita
COMPOSE="docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env"
$COMPOSE exec -T db pg_dump -U easycasa -d easycasa -Fc > ~/pre-omi-$(date +%Y%m%d-%H%M).dump
ls -lh ~/pre-omi-*.dump
```

3. Disk headroom (`df -h /`) — need ≫ 10× OMI size (~67–113 MB).

4. Schema through `0031`+:

```bash
# via migrate tooling or confirm:
$COMPOSE exec -T db psql -U easycasa -d easycasa -c \
  "SELECT name FROM _migrations WHERE name LIKE '%omi%' OR name LIKE '0031%';"
```

5. Load (from dir with CSVs; `\copy` is client-side):

```bash
cd migration/omi
gunzip -k -f omi_quotes.csv.gz omi_zone_quotes.csv.gz
# pipe load.sql into container with CSVs docker-cp'd to /tmp, or run psql
# with DATABASE_URL from the host if available
```

6. Verify:

```bash
$COMPOSE exec -T db psql -U easycasa -d easycasa -v ON_ERROR_STOP=1 < migration/omi/verify.sql
```

7. Smoke AVM:

```bash
curl -fsS -X POST https://easycasaita.com/api/avm/estimate \
  -H 'Content-Type: application/json' \
  -d '{"subject":{"comune":"MILANO","provincia":"MI","lat":45.4642,"lng":9.19,"type":"apartment","areaM2":90,"rooms":3}}'
# expect basis omi|blended; second comune (e.g. ROMA) likewise
```

8. Clean `/tmp/omi` CSVs. Do **not** truncate `omi_quotes` (microzones).

## Execution log — 2026-07-28

| Check | Result |
|-------|--------|
| Free disk | 21 GB on `/` |
| `0031` applied | yes |
| Row counts | 157266 / 29655 |
| `verify.sql` | **12/12 PASS** (period `2025-H2`) |
| Milano B12 | 870000–1090000 (€8,700–10,900/m²) |
| Backup | `/root/pre-omi-20260728-0959.dump` (7.0 MB) |
| Restore drill | scratch DB restored; counts matched; dropped |
| AVM Milano | `basis: omi`, `pricePerM2Cents: 402500` |
| AVM Roma | `basis: omi`, `pricePerM2Cents: 275000` |
| Fresh `load.sql` | **skipped** — national data already present and verified |

## Out of scope

Zone polygons / Geopoi. OMI commercial-reuse licensing (counsel). Next refresh:
H1 2026 data ~Jan 2027 — `import_omi.py` → `load.sql` → `verify.sql`.
