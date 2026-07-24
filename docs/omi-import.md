# OMI quotazioni import (K EC 1.28)

Official **Agenzia delle Entrate – OMI** quotazioni immobiliari used for the public valuation band. Attribution **«Fonte: Agenzia delle Entrate – OMI»** is mandatory and enforced in API + UI.

## Licence (read before importing)

EasyCasa only imports datasets whose licence **explicitly allows redistribution** (target: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)). Examples:

| Source | Format | Licence notes |
|--------|--------|----------------|
| **Comune / regional open-data** on [dati.gov.it](https://www.dati.gov.it) tagged *quotazioni-immobiliari* with resource licence **CC BY 4.0** | CSV / API | Preferred when available for your coverage area. Record the dataset page URL in `--licence-url`. |
| **AE “Forniture dati OMI”** (Entratel / Fisconline / SPID) | ZIP → `*_VALORI_utf8.csv` | Free download with mandatory attribution; **no explicit CC BY 4.0** on the national feed — counsel review in PR #29 applies before treating as production open data. Do **not** commit CSV/ZIP to git. |

National **zone perimeter** shapefiles/KML from Entratel are **not** under an unambiguous open licence. This stack therefore defaults to **comune-level + destinazione d’uso** matching (`geo_level=comune`) unless you import polygons into `omi_zone_polygons` from a **CC BY 4.0** municipal release.

## Apply migration

On the VPS (or any Postgres with PostGIS):

```bash
psql "$DATABASE_URL" -f migration/sql/0026_omi_quotes_extended.sql
```

## Download data (human)

1. **CC BY 4.0 path:** search [dati.gov.it](https://www.dati.gov.it) for *quotazioni immobiliari* / *OMI* for your comune or region; confirm the **resource** licence is CC BY 4.0; download the CSV.
2. **Entratel path (counsel-approved only):** [Forniture dati OMI](https://www.agenziaentrate.gov.it/portale/schede/fabbricatiterreni/omi/forniture-dati-omi) → request national or provincial **Quotazioni** export → unzip `QI_*_*_*_VALORI_utf8.csv`.

Semester token format: `YYYY-H1` or `YYYY-H2` (matches AE filename `…20162…` → `2016-H2`).

## Import command

Build the API, then run (from repo root):

```bash
pnpm --filter @easycasa/api build

DATABASE_URL=postgresql://… \
  pnpm --filter @easycasa/api omi:import -- \
  --input /path/to/valori.csv \
  --semester 2025-H2 \
  --licence-url 'https://creativecommons.org/licenses/by/4.0/' \
  [--comune-level]
```

- `--input` — local path or `https://` URL (no committed blobs).
- `--licence-url` — dataset or licence page you relied on (stored on each row).
- `--comune-level` — force `geo_level=comune` when the file has no microzone semantics.

Re-run each semester with the same `--semester`; rows **upsert** on `(period, provincia, comune, omi_zone, type, stato, cod_tip)`.

## Verify

```bash
psql "$DATABASE_URL" -c 'SELECT COUNT(*) FROM omi_quotes;'
psql "$DATABASE_URL" -c 'SELECT period, COUNT(*) FROM omi_quotes GROUP BY 1 ORDER BY 1 DESC LIMIT 5;'
```

Enable the band feature (`VALUATION_BAND_ENABLED=true` on API, `NEXT_PUBLIC_VALUATION_BAND_ENABLED=true` on web). Open a **sale** listing in a covered comune:

- Footer should show **Fonte: Agenzia delle Entrate – OMI · {semester}** (not “stima provvisoria”).
- Listings outside OMI coverage still show the provisional comparables band or “non disponibile”.
- `/avm/estimate` with `basis: "omi"` uses the same cache via `DrizzleOmiPort`.

## Semester refresh

Each AE publication (typically H1/H2): download new CSV → run `omi:import` with updated `--semester`. No scheduler in this PR.
