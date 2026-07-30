-- Remove ALL Casafari-derived inventory from the public production site.
-- Casafari tooling can remain for comps/research; rows are archived, not deleted.
--
-- Preview:
--   SELECT status, count(*) FROM listings WHERE source = 'casafari' GROUP BY 1;
--
-- After running, purge Meili document IDs for those rows (search:delete / deleteDocuments).

BEGIN;
UPDATE listings
SET status = 'archived',
    updated_at = now()
WHERE source = 'casafari'
  AND status <> 'archived';
COMMIT;
