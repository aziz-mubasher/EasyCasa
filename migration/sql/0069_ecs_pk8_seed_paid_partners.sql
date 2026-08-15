-- EC-S PK-8 — seed first paid partner-directory rows (Mundida pilot desk).
-- Idempotent: skip when same (name, province, contact) already exists.
-- These are NOT individual albo professionals — contact is the EasyCasa desk.

INSERT INTO partner_directory (
  category, name, province, credentials, contact, active, paid_placement
)
SELECT v.category, v.name, v.province, v.credentials, v.contact, true, true
FROM (
  VALUES
    (
      'notaio',
      'EasyCasa Pilot · Notaio · MI',
      'MI',
      'PK-8 pilot desk (Mundida) — not an individual albo entry; replace via outreach or PP-1 checkout',
      'partner-directory@easycasaita.com'
    ),
    (
      'geometra',
      'EasyCasa Pilot · Geometra · MI',
      'MI',
      'PK-8 pilot desk (Mundida) — not an individual albo entry; replace via outreach or PP-1 checkout',
      'partner-directory@easycasaita.com'
    ),
    (
      'ape_certifier',
      'EasyCasa Pilot · APE · RM',
      'RM',
      'PK-8 pilot desk (Mundida) — not an individual albo entry; replace via outreach or PP-1 checkout',
      'partner-directory@easycasaita.com'
    ),
    (
      'photographer',
      'EasyCasa Pilot · Photo · BS',
      'BS',
      'PK-8 pilot desk (Mundida) — not an individual albo entry; replace via outreach or PP-1 checkout',
      'partner-directory@easycasaita.com'
    ),
    (
      'virtual_tour',
      'EasyCasa Pilot · Virtual tour · TO',
      'TO',
      'PK-8 pilot desk (Mundida) — not an individual albo entry; replace via outreach or PP-1 checkout',
      'partner-directory@easycasaita.com'
    ),
    (
      'notaio',
      'EasyCasa Pilot · Notaio · NA',
      'NA',
      'PK-8 pilot desk (Mundida) — not an individual albo entry; replace via outreach or PP-1 checkout',
      'partner-directory@easycasaita.com'
    ),
    (
      'geometra',
      'EasyCasa Pilot · Geometra · RM',
      'RM',
      'PK-8 pilot desk (Mundida) — not an individual albo entry; replace via outreach or PP-1 checkout',
      'partner-directory@easycasaita.com'
    )
) AS v(category, name, province, credentials, contact)
WHERE NOT EXISTS (
  SELECT 1
  FROM partner_directory p
  WHERE p.name = v.name
    AND p.province = v.province
    AND p.contact = v.contact
);

COMMENT ON TABLE partner_directory IS
  'EC-S-T28/T29 partner directory. G3/PP-1 paid_placement. PK-8: pilot Mundida desk rows may exist until real partners replace them.';
