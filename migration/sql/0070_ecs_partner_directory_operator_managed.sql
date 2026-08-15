-- EC-S K EC 1.56 — partner directory pilot-desk honesty (Item 4).
-- Marks EasyCasa-operated rows without changing counsel-approved paid labels or sort.

ALTER TABLE partner_directory
  ADD COLUMN IF NOT EXISTS operator_managed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN partner_directory.operator_managed IS
  'True when the listing is operated by EasyCasa (pilot desk), not an independent third-party professional.';

-- PK-8 pilot desk rows (idempotent backfill).
UPDATE partner_directory
SET operator_managed = true,
    updated_at = now()
WHERE contact = 'partner-directory@easycasaita.com'
   OR name LIKE 'EasyCasa Pilot%';

COMMENT ON TABLE partner_directory IS
  'EC-S-T28/T29 partner directory. G3/PP-1 paid_placement. operator_managed marks EasyCasa pilot desk rows.';
