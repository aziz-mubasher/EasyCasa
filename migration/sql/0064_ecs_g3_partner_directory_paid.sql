-- EC-S G3 row 9 — paid partner directory placement (flat listing fee).
-- Preferential ordering for paid_placement=true; outbound referral tracking still stripped.
-- Fee collection: admin marks paid after flat fee (Stripe partner checkout can follow).

ALTER TABLE partner_directory
  ADD COLUMN IF NOT EXISTS paid_placement boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS partner_directory_paid_placement_idx
  ON partner_directory (paid_placement DESC)
  WHERE active = true AND paid_placement = true;

COMMENT ON COLUMN partner_directory.paid_placement IS
  'G3 row 9: flat-fee directory presence. Paid rows sort above unpaid; must be labelled Presenza a pagamento. No UTM/referral tracking on contact URLs.';

COMMENT ON TABLE partner_directory IS
  'EC-S-T28/T29 partner directory. Informational by default; G3 allows paid_placement (flat fee, labelled, preferential sort). Outbound referral tracking remains stripped.';
