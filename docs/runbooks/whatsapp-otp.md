# WhatsApp OTP (K EC 7.1 Phase B)

Phone verification is the first consumer of `WhatsAppService`. It proves Cloud
API send with one **authentication** template before Phase C utility templates.

## Code path

1. User starts verify: `POST /me/phone/verify/start` `{ phone }`
2. `PhoneVerifyService` → `WhatsAppService.sendAuthenticationOtp`
3. Success → `channel=whatsapp`, `provider_message_id=wamid…`
4. Failure → email fallback (if account email), `fallback_reason` stored
5. Confirm: `POST /me/phone/verify/confirm` → `users.phone_verified_at`

UI: `/privacy` → `PhoneVerifyPanel`.

## Meta template (long pole)

Submit an **Authentication** category template with a copy-code button, language
`it` (and `en` if needed). Name must match env:

```bash
WHATSAPP_OTP_TEMPLATE=easycasa_phone_verify
WHATSAPP_OTP_TEMPLATE_LANG=it
```

Until approved + credentials set, every start falls back to email
(`fallback_reason=not_configured`).

## VPS `.env` (production)

```bash
WHATSAPP_TOKEN=…                 # permanent Cloud API token
WHATSAPP_PHONE_NUMBER_ID=…       # phone number id from Meta
WHATSAPP_OTP_TEMPLATE=easycasa_phone_verify
WHATSAPP_OTP_TEMPLATE_LANG=it
WHATSAPP_GRAPH_VERSION=v21.0
WHATSAPP_VERIFY_TOKEN=…          # webhook hub verify (Phase A)
WHATSAPP_APP_SECRET=…            # X-Hub-Signature-256 (Phase A)
```

Then recreate API only:

```bash
docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml \
  --env-file .env up -d --force-recreate --no-deps api
```

Webhook URL for Meta: `https://easycasaita.com/api/whatsapp/webhook`

## Verify

```bash
# After credentials: start OTP as signed-in user on /privacy
# Challenge row should show channel=whatsapp and provider_message_id
docker compose … exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "SELECT channel, provider_message_id, fallback_reason FROM phone_otp_challenges ORDER BY created_at DESC LIMIT 5;"
```

## Not Phase B

- Utility templates / viewing reminders → Phase C (`K EC 8.7`) — `docs/runbooks/whatsapp-utility.md`
- Support queue / AI → Phase D–E (`K EC 7.3`)
