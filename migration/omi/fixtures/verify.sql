-- Fixture verify (Lombardia slice). Expects load.sql against fixtures/*.csv.
-- Usage: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migration/omi/fixtures/verify.sql

\set ON_ERROR_STOP on

CREATE TEMP TABLE omi_verify_results (
  check_name text PRIMARY KEY,
  expected   text NOT NULL,
  actual     text NOT NULL,
  passed     boolean NOT NULL
);

INSERT INTO omi_verify_results
SELECT 'distinct_comuni', '1500', count(DISTINCT comune)::text,
       count(DISTINCT comune) = 1500
FROM omi_zone_quotes;

INSERT INTO omi_verify_results
SELECT 'distinct_province', '11', count(DISTINCT provincia)::text,
       count(DISTINCT provincia) = 11
FROM omi_zone_quotes;

INSERT INTO omi_verify_results
SELECT 'null_or_empty_provincia', '0', count(*)::text, count(*) = 0
FROM omi_zone_quotes
WHERE provincia IS NULL OR btrim(provincia) = '';

-- National ORDONA anomaly is outside Lombardia — expect zero null istat here.
INSERT INTO omi_verify_results
SELECT 'null_comune_istat_count', '0', count(*)::text, count(*) = 0
FROM omi_zone_quotes
WHERE comune_istat IS NULL OR btrim(comune_istat) = '';

INSERT INTO omi_verify_results
SELECT 'zone_min_gt_max', '0', count(*)::text, count(*) = 0
FROM omi_zone_quotes
WHERE sale_min_per_m2_cents > sale_max_per_m2_cents;

INSERT INTO omi_verify_results
SELECT 'quotes_min_gt_max', '0', count(*)::text, count(*) = 0
FROM omi_quotes
WHERE min_per_m2_cents > max_per_m2_cents;

INSERT INTO omi_verify_results
SELECT 'zone_min_le_0', '0', count(*)::text, count(*) = 0
FROM omi_zone_quotes
WHERE sale_min_per_m2_cents <= 0;

INSERT INTO omi_verify_results
SELECT 'quotes_min_le_0', '0', count(*)::text, count(*) = 0
FROM omi_quotes
WHERE min_per_m2_cents <= 0;

INSERT INTO omi_verify_results
SELECT 'milano_b12_civili_normale', '870000-1090000',
       coalesce(
         (SELECT sale_min_per_m2_cents::text || '-' || sale_max_per_m2_cents::text
          FROM omi_zone_quotes
          WHERE comune = 'MILANO' AND zona = 'B12'
            AND descr_tipologia = 'Abitazioni civili' AND stato = 'normale'
          LIMIT 1),
         'MISSING'
       ),
       EXISTS (
         SELECT 1 FROM omi_zone_quotes
         WHERE comune = 'MILANO' AND zona = 'B12'
           AND descr_tipologia = 'Abitazioni civili' AND stato = 'normale'
           AND sale_min_per_m2_cents = 870000
           AND sale_max_per_m2_cents = 1090000
       );

INSERT INTO omi_verify_results
SELECT 'milano_comune_apartment', '360000-445000',
       coalesce(
         (SELECT min_per_m2_cents::text || '-' || max_per_m2_cents::text
          FROM omi_quotes
          WHERE comune = 'MILANO' AND type = 'apartment'
          LIMIT 1),
         'MISSING'
       ),
       EXISTS (
         SELECT 1 FROM omi_quotes
         WHERE comune = 'MILANO' AND type = 'apartment'
           AND min_per_m2_cents = 360000
           AND max_per_m2_cents = 445000
       );

INSERT INTO omi_verify_results
SELECT 'distinct_period', '1:2025-H2',
       count(DISTINCT period)::text || ':' || coalesce(string_agg(DISTINCT period, ','), ''),
       count(DISTINCT period) = 1 AND bool_and(period = '2025-H2')
FROM omi_zone_quotes;

INSERT INTO omi_verify_results
SELECT 'zone_row_count', '25271', count(*)::text, count(*) = 25271
FROM omi_zone_quotes;

INSERT INTO omi_verify_results
SELECT 'quotes_row_count', '5848', count(*)::text, count(*) = 5848
FROM omi_quotes;

\echo
\echo === OMI fixture verify results ===
SELECT
  CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS status,
  check_name,
  expected,
  actual
FROM omi_verify_results
ORDER BY passed ASC, check_name;

DO $$
DECLARE
  fails int;
BEGIN
  SELECT count(*) INTO fails FROM omi_verify_results WHERE NOT passed;
  IF fails > 0 THEN
    RAISE EXCEPTION 'OMI fixture verify failed: % check(s)', fails;
  END IF;
  RAISE NOTICE 'OMI fixture verify: all checks passed';
END $$;
