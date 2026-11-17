-- EC-CALLBACKS-1. Voice calls and callback rows for the Easy Casa line.
-- Summary text only. The spoken record stays with ElevenLabs.
-- Rows are scrubbed with the CRM contact (CRM_DORMANT_RETENTION_MONTHS, default 24).

ALTER TABLE crm.contacts DROP CONSTRAINT IF EXISTS crm_contacts_source_chk;
ALTER TABLE crm.contacts ADD CONSTRAINT crm_contacts_source_chk CHECK (
  source IN (
    'enquiry', 'manual', 'import', 'b4a_referral', 'partner_intake',
    'whatsapp', 'aste', 'call_request', 'whatsapp_voice'
  )
);

CREATE TABLE crm.voice_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id text NOT NULL UNIQUE,
  called_number text NOT NULL,
  caller_number text,
  contact_id uuid,
  caller_name text NOT NULL DEFAULT '',
  callback_phone text,
  callback_requested boolean NOT NULL DEFAULT false,
  preferred_callback_time text NOT NULL DEFAULT '',
  language text NOT NULL,
  topic text NOT NULL,
  caller_role text NOT NULL,
  summary text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  duration_secs integer NOT NULL DEFAULT 0,
  evaluations jsonb NOT NULL DEFAULT '{}'::jsonb,
  elevenlabs_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX voice_calls_created_idx ON crm.voice_calls (created_at DESC);
CREATE INDEX voice_calls_contact_idx ON crm.voice_calls (contact_id);

CREATE TABLE crm.callback_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('person', 'team_queue')),
  admin_user_id uuid REFERENCES users(id),
  display_name text NOT NULL,
  whatsapp_e164 text,
  email text NOT NULL DEFAULT '',
  languages text[] NOT NULL DEFAULT '{}',
  callback_minutes integer NOT NULL DEFAULT 20,
  gap_minutes integer NOT NULL DEFAULT 10,
  max_per_day integer,
  earliest_bookable_minutes integer NOT NULL DEFAULT 120,
  weekly_hours jsonb NOT NULL DEFAULT '[]'::jsonb,
  time_off jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE crm.callback_routing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  called_number text NOT NULL,
  language text NOT NULL,
  line text,
  forward_profile_id uuid NOT NULL REFERENCES crm.callback_profiles(id),
  backup_profile_id uuid REFERENCES crm.callback_profiles(id),
  confirm_within text NOT NULL DEFAULT '4h' CHECK (confirm_within IN ('2h', '4h', '1d')),
  alert_whatsapp boolean NOT NULL DEFAULT false,
  alert_email boolean NOT NULL DEFAULT true,
  offer_real_slots boolean NOT NULL DEFAULT false,
  UNIQUE (called_number, language, line)
);

CREATE UNIQUE INDEX callback_routing_lang_only_idx
  ON crm.callback_routing (called_number, language)
  WHERE line IS NULL;

CREATE TABLE crm.callback_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid,
  voice_call_id uuid NOT NULL REFERENCES crm.voice_calls(id),
  conversation_id text NOT NULL UNIQUE,
  called_number text NOT NULL,
  callback_language text NOT NULL,
  topic text NOT NULL,
  caller_role text NOT NULL,
  caller_words text NOT NULL DEFAULT '',
  owner_profile_id uuid NOT NULL REFERENCES crm.callback_profiles(id),
  backup_profile_id uuid REFERENCES crm.callback_profiles(id),
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'requested' CHECK (
    status IN ('requested', 'held', 'confirmed', 'done', 'no_answer', 'cancelled')
  ),
  held_start timestamptz,
  held_end timestamptz,
  suggested_slots jsonb NOT NULL DEFAULT '[]'::jsonb,
  confirmed_start timestamptz,
  confirmed_end timestamptz,
  booking_id uuid,
  overdue_owner_at timestamptz,
  overdue_backup_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX callback_requests_status_idx ON crm.callback_requests (status, due_at);

CREATE TABLE crm.callback_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  callback_id uuid NOT NULL REFERENCES crm.callback_requests(id),
  actor_user_id uuid,
  action text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE crm.callback_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES crm.callback_profiles(id),
  callback_id uuid REFERENCES crm.callback_requests(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  kind text NOT NULL CHECK (kind IN ('confirmed', 'hold')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX callback_bookings_profile_idx ON crm.callback_bookings (profile_id, starts_at);

-- Team queue only. AZM adds people in admin.
INSERT INTO crm.callback_profiles (
  id, kind, display_name, email, languages,
  callback_minutes, gap_minutes, max_per_day, earliest_bookable_minutes, weekly_hours
) VALUES (
  'a11ce000-0000-4000-8000-0000000000c1',
  'team_queue',
  'Team',
  'info@easycasaita.com',
  ARRAY['it']::text[],
  20,
  10,
  NULL,
  120,
  '[
    {"weekday":1,"startMin":540,"endMin":1080},
    {"weekday":2,"startMin":540,"endMin":1080},
    {"weekday":3,"startMin":540,"endMin":1080},
    {"weekday":4,"startMin":540,"endMin":1080},
    {"weekday":5,"startMin":540,"endMin":1080}
  ]'::jsonb
);

INSERT INTO crm.callback_routing (
  called_number, language, line, forward_profile_id, backup_profile_id,
  confirm_within, alert_whatsapp, alert_email, offer_real_slots
)
SELECT
  '+393793306605',
  lang,
  NULL,
  'a11ce000-0000-4000-8000-0000000000c1',
  NULL,
  '4h',
  false,
  true,
  false
FROM unnest(ARRAY['it','en','es','fr','de','pt','ur','hi','pa','bn','ar']) AS lang;
