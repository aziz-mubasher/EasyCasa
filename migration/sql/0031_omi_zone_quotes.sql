-- Phase 27.1 / K EC property evaluation — OMI zone-level quotations + comune median metadata.
--
-- Adds `omi_zone_quotes` (verbatim zone bands) and marks derived comune-level
-- `omi_quotes` rows with `basis` / `zones_used`. Existing microzone natural key
-- on omi_quotes is unchanged; derived medians use omi_zone='', stato='', cod_tip=0.
--
-- Source: Agenzia delle Entrate – OMI (attribution required).

CREATE TABLE IF NOT EXISTS omi_zone_quotes (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period                  text NOT NULL,
  link_zona               text NOT NULL,
  regione                 text NOT NULL,
  provincia               text NOT NULL,
  comune_istat            text,
  comune_cat              text NOT NULL,
  comune                  text NOT NULL,
  zona                    text NOT NULL,
  zona_descr              text,
  fascia                  text NOT NULL,
  microzona               text,
  cod_tip                 text NOT NULL,
  descr_tipologia         text NOT NULL,
  stato                   text NOT NULL,
  prevalent               boolean NOT NULL,
  sale_min_per_m2_cents   integer NOT NULL,
  sale_max_per_m2_cents   integer NOT NULL,
  sale_surface_basis      text,
  rent_min_per_m2_cents   integer,
  rent_max_per_m2_cents   integer,
  rent_surface_basis      text,
  -- Populated separately from Geopoi / open-licence zone perimeters.
  geom                    geometry(MultiPolygon, 4326),
  created_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT omi_zone_quotes_band_ck CHECK (sale_min_per_m2_cents <= sale_max_per_m2_cents),
  CONSTRAINT omi_zone_quotes_positive_ck CHECK (sale_min_per_m2_cents > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS omi_zone_quotes_natural_uidx
  ON omi_zone_quotes (period, link_zona, cod_tip, stato);

CREATE INDEX IF NOT EXISTS omi_zone_quotes_comune_idx
  ON omi_zone_quotes (comune, provincia, cod_tip, period DESC)
  WHERE prevalent;

CREATE INDEX IF NOT EXISTS omi_zone_quotes_geom_gix
  ON omi_zone_quotes USING gist (geom)
  WHERE geom IS NOT NULL;

ALTER TABLE omi_quotes
  ADD COLUMN IF NOT EXISTS basis text NOT NULL DEFAULT 'source_row',
  ADD COLUMN IF NOT EXISTS zones_used integer NOT NULL DEFAULT 1;

COMMENT ON COLUMN omi_quotes.basis IS
  'source_row = imported OMI CSV row; zone_median = median of prevalent-state zone '
  'bands across the comune (DERIVED). Do not present zone_median as an official OMI '
  'band — cite omi_zone_quotes for zone-level values.';

COMMENT ON TABLE omi_zone_quotes IS
  'Verbatim Agenzia delle Entrate – OMI zone quotations. Attribution required.';
