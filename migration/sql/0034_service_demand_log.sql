-- EC-10: demand signal when a catalogue item is unavailable in a province.
-- Answers "which professional do we recruit next, and where".

CREATE TABLE IF NOT EXISTS service_demand_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code   text NOT NULL,
  province    text NOT NULL,
  user_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_demand_log_item_prov_idx
  ON service_demand_log (item_code, province, created_at DESC);

COMMENT ON TABLE service_demand_log IS
  'EC-10: one row when a user opens/notifies on an unavailable catalogue item.';
