-- K EC 1.38 follow-up: catalog checkout orders are user-rooted (no property/listing yet).
-- Extends service_orders_subject_chk to accept user_id as a valid subject.

ALTER TABLE service_orders
  DROP CONSTRAINT IF EXISTS service_orders_subject_chk;

ALTER TABLE service_orders
  ADD CONSTRAINT service_orders_subject_chk
  CHECK (
    property_id IS NOT NULL
    OR listing_id IS NOT NULL
    OR user_id IS NOT NULL
  );
