-- Phase 29: viewings & scheduling.

CREATE TABLE IF NOT EXISTS viewing_availability (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id     uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  weekday        integer NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  start_minutes  integer NOT NULL CHECK (start_minutes >= 0 AND start_minutes <= 1440),
  end_minutes    integer NOT NULL CHECK (end_minutes >= 0 AND end_minutes <= 1440)
);

CREATE INDEX IF NOT EXISTS idx_viewing_availability_listing
  ON viewing_availability (listing_id);

CREATE TABLE IF NOT EXISTS viewings (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id         uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  seeker_user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conductor_user_id  uuid NOT NULL REFERENCES users(id),
  enquiry_id         uuid REFERENCES enquiries(id) ON DELETE SET NULL,
  start_at           timestamptz NOT NULL,
  end_at             timestamptz NOT NULL,
  status             text NOT NULL DEFAULT 'REQUESTED',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_viewings_listing_status ON viewings (listing_id, status);
CREATE INDEX IF NOT EXISTS idx_viewings_seeker ON viewings (seeker_user_id);
CREATE INDEX IF NOT EXISTS idx_viewings_conductor ON viewings (conductor_user_id);
CREATE INDEX IF NOT EXISTS idx_viewings_enquiry ON viewings (enquiry_id);

-- Prevent double-booking the same start on active viewings.
CREATE UNIQUE INDEX IF NOT EXISTS idx_viewings_active_slot
  ON viewings (listing_id, start_at)
  WHERE status IN ('REQUESTED', 'CONFIRMED');
