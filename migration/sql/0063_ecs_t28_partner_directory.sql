-- EC-S-T28/T29 — neutral partner directory (no fees / no conversion tracking).
-- Monetised referral variants wait for G3 row 9.
-- Migration id 0063 (0060=T30, 0061=T27, 0062=T26 reserved on other branches — do not reuse).

CREATE TABLE IF NOT EXISTS partner_directory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL
    CHECK (category IN ('notaio', 'geometra', 'ape_certifier', 'photographer', 'virtual_tour')),
  name text NOT NULL,
  province text NOT NULL,
  credentials text,
  contact text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_directory_province_idx ON partner_directory (province);
CREATE INDEX IF NOT EXISTS partner_directory_category_idx ON partner_directory (category);
CREATE INDEX IF NOT EXISTS partner_directory_active_idx ON partner_directory (active)
  WHERE active = true;

COMMENT ON TABLE partner_directory IS
  'EC-S-T28/T29 neutral informational directory. No fees, no conversion tracking, no paid ordering. Monetised variants wait for G3 row 9.';
