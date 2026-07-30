-- K EC 7.1 Phase B: OTP consumer observability (WhatsApp message id + fallback reason).

ALTER TABLE phone_otp_challenges
  ADD COLUMN IF NOT EXISTS provider_message_id text,
  ADD COLUMN IF NOT EXISTS fallback_reason text;

COMMENT ON COLUMN phone_otp_challenges.provider_message_id IS
  'WhatsApp Cloud wamid when channel=whatsapp; null for email fallback.';
COMMENT ON COLUMN phone_otp_challenges.fallback_reason IS
  'When channel=email: not_configured | not_on_whatsapp | api_error.';
