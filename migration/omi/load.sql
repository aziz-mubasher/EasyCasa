-- Load Phase 27.1 OMI seed into EasyCasa (comune medians + zone quotes).
--
-- Prerequisites:
--   1. migration/sql/0031_omi_zone_quotes.sql applied
--   2. From this directory: gunzip -k -f omi_quotes.csv.gz omi_zone_quotes.csv.gz
--   3. psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f load.sql
--
-- Period tokens in the seed CSVs use 2025S2; we normalize to 2025-H2 to match
-- the TypeScript omi:import / docs convention. Derived omi_quotes rows use
-- natural-key defaults (omi_zone='', stato='', cod_tip=0, geo_level=comune).

BEGIN;

CREATE TEMP TABLE omi_zone_quotes_staging (
  period                  text,
  link_zona               text,
  regione                 text,
  provincia               text,
  comune_istat            text,
  comune_cat              text,
  comune                  text,
  zona                    text,
  zona_descr              text,
  fascia                  text,
  microzona               text,
  cod_tip                 text,
  descr_tipologia         text,
  stato                   text,
  prevalent               boolean,
  sale_min_per_m2_cents   integer,
  sale_max_per_m2_cents   integer,
  sale_surface_basis      text,
  rent_min_per_m2_cents   integer,
  rent_max_per_m2_cents   integer,
  rent_surface_basis      text
);

\copy omi_zone_quotes_staging FROM 'omi_zone_quotes.csv' WITH (FORMAT csv, HEADER true, NULL '');

INSERT INTO omi_zone_quotes (
  period, link_zona, regione, provincia, comune_istat, comune_cat, comune,
  zona, zona_descr, fascia, microzona, cod_tip, descr_tipologia, stato,
  prevalent, sale_min_per_m2_cents, sale_max_per_m2_cents, sale_surface_basis,
  rent_min_per_m2_cents, rent_max_per_m2_cents, rent_surface_basis
)
SELECT
  CASE
    WHEN period ~ '^\d{4}S[12]$' THEN regexp_replace(period, 'S([12])$', '-H\1')
    ELSE period
  END,
  link_zona, regione, upper(trim(provincia)), comune_istat, comune_cat,
  upper(trim(comune)),
  zona, zona_descr, fascia, microzona, cod_tip, descr_tipologia, stato,
  prevalent, sale_min_per_m2_cents, sale_max_per_m2_cents, sale_surface_basis,
  rent_min_per_m2_cents, rent_max_per_m2_cents, rent_surface_basis
FROM omi_zone_quotes_staging
ON CONFLICT (period, link_zona, cod_tip, stato) DO UPDATE SET
  regione                 = EXCLUDED.regione,
  provincia               = EXCLUDED.provincia,
  comune_istat            = EXCLUDED.comune_istat,
  comune_cat              = EXCLUDED.comune_cat,
  comune                  = EXCLUDED.comune,
  zona                    = EXCLUDED.zona,
  zona_descr              = EXCLUDED.zona_descr,
  fascia                  = EXCLUDED.fascia,
  microzona               = EXCLUDED.microzona,
  descr_tipologia         = EXCLUDED.descr_tipologia,
  prevalent               = EXCLUDED.prevalent,
  sale_min_per_m2_cents   = EXCLUDED.sale_min_per_m2_cents,
  sale_max_per_m2_cents   = EXCLUDED.sale_max_per_m2_cents,
  sale_surface_basis      = EXCLUDED.sale_surface_basis,
  rent_min_per_m2_cents   = EXCLUDED.rent_min_per_m2_cents,
  rent_max_per_m2_cents   = EXCLUDED.rent_max_per_m2_cents,
  rent_surface_basis      = EXCLUDED.rent_surface_basis;

CREATE TEMP TABLE omi_quotes_staging (
  comune              text,
  provincia           text,
  type                text,
  min_per_m2_cents    integer,
  max_per_m2_cents    integer,
  period              text,
  basis               text,
  zones_used          integer
);

\copy omi_quotes_staging FROM 'omi_quotes.csv' WITH (FORMAT csv, HEADER true, NULL '');

INSERT INTO omi_quotes (
  comune, provincia, type, min_per_m2_cents, max_per_m2_cents, period,
  basis, zones_used, omi_zone, stato, cod_tip, geo_level, attribution, updated_at
)
SELECT
  upper(trim(comune)),
  upper(trim(provincia)),
  type,
  min_per_m2_cents,
  max_per_m2_cents,
  CASE
    WHEN period ~ '^\d{4}S[12]$' THEN regexp_replace(period, 'S([12])$', '-H\1')
    ELSE period
  END,
  coalesce(nullif(basis, ''), 'zone_median'),
  coalesce(zones_used, 1),
  '',
  '',
  0,
  'comune',
  'Fonte: Agenzia delle Entrate – OMI',
  now()
FROM omi_quotes_staging
ON CONFLICT (period, provincia, comune, omi_zone, type, stato, cod_tip) DO UPDATE SET
  min_per_m2_cents = EXCLUDED.min_per_m2_cents,
  max_per_m2_cents = EXCLUDED.max_per_m2_cents,
  basis            = EXCLUDED.basis,
  zones_used       = EXCLUDED.zones_used,
  geo_level        = EXCLUDED.geo_level,
  attribution      = EXCLUDED.attribution,
  updated_at       = now();

COMMIT;

SELECT 'omi_zone_quotes' AS table, count(*) AS rows FROM omi_zone_quotes
UNION ALL
SELECT 'omi_quotes', count(*) FROM omi_quotes;
