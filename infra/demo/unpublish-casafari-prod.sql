-- EC-15 — remove Casafari-derived inventory from public production URLs.
-- Run ONLY against production after review. Casafari tooling stays for comps/research.
--
--   docker compose … exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < infra/demo/unpublish-casafari-prod.sql
--
-- Preview first:
--   SELECT id, slug, status, city FROM listings WHERE source = 'casafari' AND status = 'published';

BEGIN;
UPDATE listings
SET status = 'archived',
    updated_at = now()
WHERE source = 'casafari'
  AND status = 'published';
COMMIT;
