-- EC-S-T21/T22 — seller viewings + open-house capacity on availability windows.
-- Migration id 0055 (0055 reserved for T20 enquiry inbox).
--
-- capacity DEFAULT 1 preserves Phase 29 / agent one-visitor-per-slot behaviour.
-- Confirmed bookings count toward capacity; REQUESTED is unbounded (T22).
-- Replace the single-active-booking unique index so open-house can stack
-- multiple seekers on the same start_at (same seeker still cannot double-book).

ALTER TABLE viewing_availability
  ADD COLUMN IF NOT EXISTS capacity integer NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'viewing_availability_capacity_check'
  ) THEN
    ALTER TABLE viewing_availability
      ADD CONSTRAINT viewing_availability_capacity_check
      CHECK (capacity >= 1 AND capacity <= 100);
  END IF;
END $$;

COMMENT ON COLUMN viewing_availability.capacity IS
  'Max CONFIRMED viewings per concrete slot from this window (EC-S T22). Default 1.';

DROP INDEX IF EXISTS idx_viewings_active_slot;

CREATE UNIQUE INDEX IF NOT EXISTS idx_viewings_active_slot_seeker
  ON viewings (listing_id, start_at, seeker_user_id)
  WHERE status IN ('REQUESTED', 'CONFIRMED');
