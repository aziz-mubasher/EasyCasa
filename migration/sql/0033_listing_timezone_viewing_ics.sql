-- EC-4: listing timezone for wall-clock availability + ICS sequence / reminders.
--
-- Availability `start_minutes` / `end_minutes` were always authored as local
-- wall-clock intent (owners think in Rome time). Phase 29 incorrectly resolved
-- them as UTC. We do **not** rewrite minute values: the same numbers are now
-- interpreted in `listings.timezone` (default Europe/Rome), which restores the
-- intended wall-clock meaning. Previously generated UTC slots were wrong for
-- CEST/CET; new generation is correct.

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Europe/Rome';

ALTER TABLE viewings
  ADD COLUMN IF NOT EXISTS ics_sequence integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_2h_sent_at timestamptz;

COMMENT ON COLUMN listings.timezone IS
  'IANA TZ for interpreting viewing_availability wall-clock minutes (EC-4).';
COMMENT ON COLUMN viewings.ics_sequence IS
  'ICS SEQUENCE — increment on reschedule so calendars replace, not duplicate.';
