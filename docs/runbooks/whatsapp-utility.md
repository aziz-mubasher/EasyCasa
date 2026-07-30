# WhatsApp utility notifications (Phase C / EC-16 / K EC 8.7)

Transactional **utility** templates only — no marketing. Sends go through `WhatsAppService.sendTemplate` from `DefaultViewingNotifier` / `DefaultEnquiryNotifier`. Every Cloud attempt writes `whatsapp_messages` (no body content); webhook statuses update by `provider_message_id`.

## Prerequisites

1. Phase A–C live: Cloud credentials + webhook.
2. Recipient has `users.phone` + `users.phoneVerifiedAt` (EC-12).
3. Meta templates approved — **EC-16 Part 0** (7 names × `it`/`en`/`es`).
4. `DEMO_MODE=true` → Cloud client reports not configured (no sends).

## Env (VPS `.env`)

```bash
WHATSAPP_TOKEN=…
WHATSAPP_PHONE_NUMBER_ID=…
# Auth OTP — separate from utility names (EC-16)
WHATSAPP_OTP_TEMPLATE=easycasa_otp
WHATSAPP_OTP_TEMPLATE_LANG=it

WHATSAPP_VIEWING_REMINDER_24H_TEMPLATE=easycasa_viewing_reminder_24h
WHATSAPP_VIEWING_REMINDER_2H_TEMPLATE=easycasa_viewing_reminder_2h
WHATSAPP_VIEWING_REQUESTED_TEMPLATE=easycasa_viewing_requested
WHATSAPP_VIEWING_CONFIRMED_TEMPLATE=easycasa_viewing_confirmed
WHATSAPP_VIEWING_CANCELLED_TEMPLATE=easycasa_viewing_cancelled
WHATSAPP_ENQUIRY_RECEIVED_TEMPLATE=easycasa_enquiry_received
```

Redeploy API after changing env (`--force-recreate --no-deps api`).

## Meta template body parameter order (EC-16 pack)

| Template | Body variables |
|---|---|
| `easycasa_enquiry_received` | `{{1}}` owner name · `{{2}}` listing title |
| `easycasa_viewing_requested` | `{{1}}` conductor · `{{2}}` listing · `{{3}}` when — **no seeker name** |
| `easycasa_viewing_confirmed` | `{{1}}` listing · `{{2}}` when · `{{3}}` address · `{{4}}` conductor |
| `easycasa_viewing_reminder_24h` | `{{1}}` listing · `{{2}}` time · `{{3}}` address |
| `easycasa_viewing_reminder_2h` | `{{1}}` listing · `{{2}}` time · `{{3}}` address · `{{4}}` other party phone |
| `easycasa_viewing_cancelled` | `{{1}}` listing · `{{2}}` date · `{{3}}` time |

Italian copy is canonical; EN/ES must match meaning literally (see stakeholder EC-16 brief).

## Delivery status + measurement

- Table: `whatsapp_messages` (migration `0039`).
- Admin: `GET /admin/whatsapp/metrics?days=90` — reminder delivery rate, no-show with/without delivered reminder, failure rate by template.
- Report raw counts until ~100 viewings; do not claim significance early.
- Erasure: `to_user_id` set null; rows retained for stats.

## Behaviour

- Reminders notify seeker + conductor.
- Fail-soft: missing Cloud / empty template / unverified phone → skip WA; email/in-app continue.

## Human checklist (Part 0)

See `docs/ec-16-whatsapp-templates-measurement.md`.
