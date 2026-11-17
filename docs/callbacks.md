# Callbacks — Easy Casa voice line (EC-CALLBACKS-1)

T04 rows: **4** (a person confirms a time) and **5** (WhatsApp / email transport).
Rows **10–12** stay prohibited. A callback is contact handling. It does not call
`routeLead`, score a lead, or hand anyone to a seller, a partner, or Banks4All.

Surveyed from `origin/main` `6a4afa2` (merge of PR #272).

## What the repo already had

- Admin is `apps/admin`, hash routes, live at `admin.easycasaita.com`. Fonts are
  **Bricolage Grotesque**, **Newsreader**, **IBM Plex Mono** (`apps/admin/index.html`).
- Contacts live in `crm.contacts`. Phone match is digits-only. New source: `whatsapp_voice`.
- The site scheduler is **listing viewings** (`viewings` / `viewing_availability`). It has no
  team owner. Public `/prenota-chiamata` creates a CRM task, not a calendar block.
  Confirming a voice callback writes `crm.callback_bookings` (owner + slot, linked both ways).
  It does not create a viewing.
- WhatsApp sends from this repo through `WhatsAppCloudClient` / `WhatsAppService` using
  `WHATSAPP_PHONE_NUMBER_ID`. `.env.example` documents `WHATSAPP_BUSINESS_NUMBER=+393793306605`.
  No bridge to mundida.com was added.
- `routeLead` stays in `apps/api/src/partners/partners.service.ts`, called from messaging.
  The callbacks module does not import it. A unit test fails if that import appears.
- Ship path: `docs/deploy.md` builds the `api` and `admin` images from Dockerfiles.
  Do not overlay-restart the API. Keepers stay `azm-keep-overlay-*`.

## Identity

There is no `LEGAL_ENTITY` object. The admin footer reads `EASYCASA_DENOMINAZIONE` and
`EASYCASA_PIVA`. The code default P.IVA is the placeholder `IT00000000000`. The footer
says so when that value (or an empty one) is what the process loaded. Caller messages
sign `Easy Casa Italia · Ayni Group Italia`, the same group name as the WhatsApp intake.

## Retention

Voice-call summaries and callback rows stay with the CRM contact. Dormant-contact
anonymisation (`CRM_DORMANT_RETENTION_MONTHS`, default 24) clears the name, numbers,
summary and the caller’s words. There is no transcript column and no audio column.
ElevenLabs keeps its own copy; the admin stores a link, shown to operations and superadmin.

## Deadline clock

Guess, used by `due_at`: Monday–Friday 09:00–17:00 Europe/Rome. `2h` and `4h` are working
hours inside that window. `1d` is 8 working hours. Team weekly hours are separate and
default, for the Team queue only, to Monday–Friday 09:00–18:00 until AZM names people.

## Webhook

`POST /api/voice/callbacks/webhook`

ElevenLabs header `ElevenLabs-Signature: t=<unix>,v0=<hex>`, HMAC-SHA256 over
`timestamp.rawBody`, tolerance 30 minutes. Idempotent on `conversation_id`.
Audio events are ignored. Only numbers in `VOICE_CALLBACK_NUMBERS` are stored.

Phase B (live slots on the call) is not mounted. The routing toggle stays off.

## Deploy

Set `ELEVENLABS_WEBHOOK_SECRET` on the API env, apply `migration/sql/0081_voice_callbacks.sql`,
then rebuild **api** and **admin** from source (`docs/deploy.md`). Give Claude the URL
`https://easycasaita.com/api/voice/callbacks/webhook` so the webhook can be registered
on agent `agent_4101m7mysnsyfv7v1bwh9gjp0r7b`.
