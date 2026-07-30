# WhatsApp utility notifications (Phase C / K EC 8.7)

Transactional **utility** templates only — no marketing. Sends go through `WhatsAppService.sendTemplate` from `DefaultViewingNotifier` / `DefaultEnquiryNotifier`.

## Prerequisites

1. Phase A–B live: Cloud credentials + webhook (see `docs/runbooks/whatsapp-otp.md`).
2. Recipient has `users.phone` + `users.phoneVerifiedAt` (EC-12). Unverified → skip WhatsApp (email/in-app still fire).
3. Meta **Utility** templates approved with body variable counts below.
4. `DEMO_MODE=true` → Cloud client reports not configured (no sends).

## Env (VPS `.env`)

```bash
# Shared Cloud credentials (Phase A)
WHATSAPP_TOKEN=…
WHATSAPP_PHONE_NUMBER_ID=…
WHATSAPP_OTP_TEMPLATE_LANG=it

# Phase C — empty string skips that template only
WHATSAPP_VIEWING_REMINDER_24H_TEMPLATE=easycasa_viewing_reminder_24h
WHATSAPP_VIEWING_REMINDER_2H_TEMPLATE=easycasa_viewing_reminder_2h
WHATSAPP_VIEWING_REQUESTED_TEMPLATE=easycasa_viewing_requested
WHATSAPP_VIEWING_CONFIRMED_TEMPLATE=easycasa_viewing_confirmed
WHATSAPP_VIEWING_CANCELLED_TEMPLATE=easycasa_viewing_cancelled
WHATSAPP_ENQUIRY_RECEIVED_TEMPLATE=easycasa_enquiry_received
```

Redeploy API after changing env (`docker compose … up -d --force-recreate --no-deps api`).

## Meta template body parameter order

Must match code in `apps/api/src/viewings/viewing-whatsapp.ts`.

| Template env | Suggested Meta name | Body variables |
|---|---|---|
| `WHATSAPP_VIEWING_REMINDER_24H_TEMPLATE` | `easycasa_viewing_reminder_24h` | `{{1}}` name · `{{2}}` listing · `{{3}}` **area (city/province, no street)** · `{{4}}` when |
| `WHATSAPP_VIEWING_REMINDER_2H_TEMPLATE` | `easycasa_viewing_reminder_2h` | `{{1}}` name · `{{2}}` listing · `{{3}}` **street address** · `{{4}}` when |
| `WHATSAPP_VIEWING_CONFIRMED_TEMPLATE` | `easycasa_viewing_confirmed` | `{{1}}` name · `{{2}}` listing · `{{3}}` street address · `{{4}}` when |
| `WHATSAPP_VIEWING_REQUESTED_TEMPLATE` | `easycasa_viewing_requested` | `{{1}}` conductor · `{{2}}` seeker · `{{3}}` listing · `{{4}}` area · `{{5}}` when |
| `WHATSAPP_VIEWING_CANCELLED_TEMPLATE` | `easycasa_viewing_cancelled` | `{{1}}` name · `{{2}}` listing · `{{3}}` area · `{{4}}` when |
| `WHATSAPP_ENQUIRY_RECEIVED_TEMPLATE` | `easycasa_enquiry_received` | `{{1}}` owner/mediator · `{{2}}` listing · `{{3}}` intent |

Disclosure: street address only on **confirmed** and **2h reminder**.

## Behaviour

- **Reminders:** `ViewingsReminderScheduler` notifies **seeker + conductor**, then sets `reminder_*_sent_at`.
- Fail-soft: missing Cloud config, empty template name, unverified phone, or Graph error → log warn; never fail the email/in-app path.
- **Orders:** no status WhatsApp yet (no order notifier in repo).

## Smoke check

1. User with verified phone; confirmed viewing ~24h out.
2. Wait for scheduler (15 min) or restart API (runs once on init).
3. API logs: successful send or `viewing whatsapp skip reason=…`.
4. Meta Business Manager → message delivery / template analytics.
