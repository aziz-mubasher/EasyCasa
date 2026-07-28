-- OMI national seed verification (H2 2025 / period 2025-H2 after load.sql normalize).
-- Usage: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migration/omi/verify.sql
-- Exits non-zero if any check fails.

\set ON_ERROR_STOP on

CREATE TEMP TABLE omi_verify_results (
  check_name text PRIMARY KEY,
  expected   text NOT NULL,
  actual     text NOT NULL,
  passed     boolean NOT NULL
);

-- 1. Distinct comuni
INSERT INTO omi_verify_results
SELECT 'distinct_comuni', '7866', count(DISTINCT comune)::text,
       count(DISTINCT comune) = 7866
FROM omi_zone_quotes;

-- 2. Distinct province
INSERT INTO omi_verify_results
SELECT 'distinct_province', '103', count(DISTINCT provincia)::text,
       count(DISTINCT provincia) = 103
FROM omi_zone_quotes;

-- 3. NULL/empty provincia
INSERT INTO omi_verify_results
SELECT 'null_or_empty_provincia', '0', count(*)::text, count(*) = 0
FROM omi_zone_quotes
WHERE provincia IS NULL OR btrim(provincia) = '';

-- 4. Comuni with NULL comune_istat — exactly 1 (ORDONA, FG) with comune_cat populated
INSERT INTO omi_verify_results
SELECT 'null_comune_istat_count', '1', count(*)::text, count(*) = 1
FROM omi_zone_quotes
WHERE comune_istat IS NULL OR btrim(comune_istat) = '';

INSERT INTO omi_verify_results
SELECT 'ordona_null_istat_has_cat', 'true',
       CASE WHEN EXISTS (
         SELECT 1 FROM omi_zone_quotes
         WHERE (comune_istat IS NULL OR btrim(comune_istat) = '')
           AND upper(comune) = 'ORDONA'
           AND upper(provincia) = 'FG'
           AND comune_cat IS NOT NULL AND btrim(comune_cat) <> ''
       ) THEN 'true' ELSE 'false' END,
       EXISTS (
         SELECT 1 FROM omi_zone_quotes
         WHERE (comune_istat IS NULL OR btrim(comune_istat) = '')
           AND upper(comune) = 'ORDONA'
           AND upper(provincia) = 'FG'
           AND comune_cat IS NOT NULL AND btrim(comune_cat) <> ''
       );

-- 5. min > max
INSERT INTO omi_verify_results
SELECT 'zone_min_gt_max', '0', count(*)::text, count(*) = 0
FROM omi_zone_quotes
WHERE sale_min_per_m2_cents > sale_max_per_m2_cents;

INSERT INTO omi_verify_results
SELECT 'quotes_min_gt_max', '0', count(*)::text, count(*) = 0
FROM omi_quotes
WHERE min_per_m2_cents > max_per_m2_cents;

-- 6. min <= 0
INSERT INTO omi_verify_results
SELECT 'zone_min_le_0', '0', count(*)::text, count(*) = 0
FROM omi_zone_quotes
WHERE sale_min_per_m2_cents <= 0;

INSERT INTO omi_verify_results
SELECT 'quotes_min_le_0', '0', count(*)::text, count(*) = 0
FROM omi_quotes
WHERE min_per_m2_cents <= 0;

-- 7. MILANO B12 abitazioni civili / normale — €8,700–10,900 /m²
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

-- 8. MILANO comune-level apartment — €3,600–4,450 /m²
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

-- 9. Distinct period — load.sql normalizes 2025S2 → 2025-H2
INSERT INTO omi_verify_results
SELECT 'distinct_period', '1:2025-H2',
       count(DISTINCT period)::text || ':' || coalesce(string_agg(DISTINCT period, ','), ''),
       count(DISTINCT period) = 1 AND bool_and(period = '2025-H2')
FROM omi_zone_quotes;

\echo
\echo === OMI verify results ===
SELECT
  CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS status,
  check_name,
  expected,
  actual
FROM omi_verify_results
ORDER BY passed ASC, check_name;

SELECT
  count(*) FILTER (WHERE NOT passed) AS failures,
  count(*) AS total
FROM omi_verify_results;

DO $$
DECLARE
  fails int;
BEGIN
  SELECT count(*) INTO fails FROM omi_verify_results WHERE NOT passed;
  IF fails > 0 THEN
    RAISE EXCEPTION 'OMI verify failed: % check(s)', fails;
  END IF;
  RAISE NOTICE 'OMI verify: all checks passed';
END $$;
