-- EC-SELL-PRIVATELY-1 / R4 — count only. Do not UPDATE, DELETE, or unpublish.
-- Published listings missing energy class and/or energy performance index.
-- [[BUCO: elenco cause di esenzione APE]] — this query does not treat NULL as exemption.

SELECT
  count(*) FILTER (WHERE status = 'published') AS published_total,
  count(*) FILTER (
    WHERE status = 'published'
      AND (
        energy_class IS NULL
        OR btrim(energy_class) = ''
        OR energy_performance_kwh_m2_y IS NULL
      )
  ) AS published_missing_class_or_index,
  count(*) FILTER (
    WHERE status = 'published'
      AND (energy_class IS NULL OR btrim(energy_class) = '')
  ) AS published_missing_class,
  count(*) FILTER (
    WHERE status = 'published'
      AND energy_performance_kwh_m2_y IS NULL
  ) AS published_missing_index
FROM listings;

-- Ownership-checked cases (P3). Last recorded production count was 0 (2026-08-15).
SELECT count(*) AS verified_owner_case_total FROM verified_owner_case;
