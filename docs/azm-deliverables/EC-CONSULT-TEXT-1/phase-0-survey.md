# EC-CONSULT-TEXT-1 — Phase 0 survey (STOP)

**Task:** S EC EC-CONSULT-TEXT-1 · EC Consult in Easy Casa WhatsApp admin — 6605 texts + full KB  
**Brief:** v2 · 28 Nov 2026 (Phase 0 only — no Phases A/B code)  
**Repo survey base:** `origin/main` @ `c0df064a8849dd2ba0879c2bcb1f73a20b61a108` (merge PR #281, 28 Nov 2026)  
**Production API marker (read 28 Nov 2026):** `curl https://easycasaita.com/api/version` → `gitSha` `c0df064`, `builtAt` `2026-11-28T10:51:37Z`

## Executive summary

| Question | Short answer |
|----------|----------------|
| Does Nest receive 6605 texts today? | **Almost certainly no.** Meta delivers 6605 to the **Scuola Video** WABA wired to **ElevenLabs**; Nest’s Cloud webhook serves the **Easycasaita** WABA (`61588757714987`). |
| Is EC Consult (KB + fences) in this repo? | **No.** Live 6605 behaviour is documented for ElevenLabs only (`docs/ec-chat-train-1.md`). Nest has journey / optional **intake** scripting and **human-send** Claude assist — not EC Consult. |
| Can we ship without overlay? | **Yes** for API/admin: `docs/deploy.md` rebuilds `api` + `admin` images (`azm-keep-overlay-*` Traefik only). |
| Blocker for live Graph survey | **`META_6605_TOKEN` not available in this agent environment.** Use `scripts/meta-waba-6605-survey.mjs` on a host that has it. |

---

## 1 — Meta app, token, webhook, WABA, last 6605 inbound to Nest

### Easy Casa WhatsApp admin (Nest) today

| Item | Repo / production evidence |
|------|---------------------------|
| Public webhook | `GET/POST https://easycasaita.com/api/whatsapp/webhook` — `apps/api/src/whatsapp/whatsapp.webhook.controller.ts` |
| Health | `GET https://easycasaita.com/api/whatsapp/webhook/status` |
| Verify token env | `WHATSAPP_VERIFY_TOKEN` |
| Signature | `WHATSAPP_APP_SECRET` → `X-Hub-Signature-256` (fail closed if empty) |
| Send path | `WhatsAppCloudClient` → Graph `/{WHATSAPP_PHONE_NUMBER_ID}/messages` |
| System user token | `WHATSAPP_TOKEN` (VPS secret — **not** in repo) |

### WABA / phone the Nest stack is built for

From `apps/api/src/config/load.ts` and `docs/env.md`:

- **Template-read WABA default:** `WHATSAPP_WABA_ID` = **`61588757714987`** (node name *Easycasaita*, AZM 10 Nov 2026).
- **Send phone:** `WHATSAPP_PHONE_NUMBER_ID` (secret) — **not** `1448737268325965` unless ops deliberately pointed Nest at 6605 (brief says they did not).
- **6605 / ElevenLabs line (read-only constants):** `WHATSAPP_LIVE_PHONE_NUMBER_ID` default **`1448737268325965`**, agent `WHATSAPP_LIVE_AGENT_ID` = `agent_4101m7mysnsyfv7v1bwh9gjp0r7b`.

### Meta app name (historical)

`docs/ec-consult-kb-omnichannel-v1.1.md` and `docs/ec-chat-train-1.md`: developer app **「Easy Casa Italy」** owned the **old** Mundida portfolio WABA; 6605 was moved **22 Nov 2026** to WABA **`1139868405295155`** (*Scuola Video*) for ElevenLabs. The Nest app/token on VPS is still tied to the **Easycasaita** account unless AZM re-subscribed the same app to the new WABA (Phase A).

### Last inbound to Nest (any number on Nest webhook)

Production poll **28 Nov 2026**:

```json
{
  "ok": true,
  "configured": true,
  "graphVersion": "v21.0",
  "phoneNumberIdSet": true,
  "appSecretSet": true,
  "verifyTokenSet": true,
  "lastInboundAt": "2026-11-21T15:33:29.000Z",
  "signatureRejectedTotal": 0
}
```

`lastInboundAt` is the latest row in `wa_inbound_messages` for **whatever** `phone_number_id` Nest receives — **not** filtered to 6605. There is **no** code path that logs “last message on 1448737268325965” separately. Given `whatsapp-channel.md` and `ec-chat-train-1.md`, treat **6605 → Nest inbound as none since the 22 Nov cut-over** unless Graph or DB analytics prove otherwise.

---

## 2 — Graph API survey (WABA `1139868405295155`)

**Agent run:** token absent → live calls **not executed**.

### How AZM runs it (read-only)

On the voice host or any machine with `META_6605_TOKEN` in `.env` (see `docs/runbooks/wa-templates.md` — Nest `WHATSAPP_TOKEN` **cannot** read this WABA):

```bash
cd /opt/easycasa-ita   # or repo root with .env
META_6605_TOKEN=… node scripts/meta-waba-6605-survey.mjs | tee /tmp/meta-6605-survey.json
```

The script calls:

1. `GET /1139868405295155/subscribed_apps` — expect **ElevenLabs** app subscribed for `messages`.
2. `GET /1448737268325965?fields=display_phone_number,verified_name,quality_rating,messaging_limit_tier,webhook_configuration,…`
3. `GET /1448737268325965/settings` — calling/SIP (read only).
4. `GET /1139868405295155/message_templates` — template inventory summary.

**Expected hypotheses (unverified until token run):**

- `subscribed_apps` includes ElevenLabs; Easy Casa Italy app **absent** until Phase A subscribe.
- `webhook_configuration` on the phone may still reference ElevenLabs or a legacy mundida callback — **check override** (question 6).

---

## 3 — Business portfolio + granting Easy Casa Italy app access

**Ownership (from brief + in-repo docs, not visura):**

- WABA **`1139868405295155`** — business account label **「Scuola Video - ElevenLabs」**.
- Prior 6605 home: Mundida portfolio / old WABA `1533988491212230`, phone `904322156102045` (EC-CALLBACKS-1 era).

### Click-by-click for AZM (Meta Business Settings)

1. Open [business.facebook.com](https://business.facebook.com) → **Settings** (gear) → **Accounts** → **WhatsApp accounts**.
2. Select account **`1139868405295155`** (Scuola Video).
3. **Assign partners** or **Add people** → add the **Easy Casa Italy** system user (or the Business that owns the Nest Meta app).
4. Grant at minimum: **Manage WhatsApp Business Account** (or “Full control” on that WABA per Meta’s current role names).
5. In **Business settings → System users** → select the Nest **system user** → **Add assets** → WhatsApp account `1139868405295155` → generate token with `whatsapp_business_management`, `whatsapp_business_messaging` if Nest will send.
6. Store token as **`META_6605_TOKEN`** (already referenced in `scripts/submit-ec-call-permission.mjs`) — **do not** commit; optional alias on VPS for Phase A send config.
7. Re-run `node scripts/meta-waba-6605-survey.mjs` to confirm Graph reads succeed.
8. **Do not** remove ElevenLabs’ `subscribed_apps` entry until Claude disables ElevenLabs messaging and Nest dry-run is verified (brief §6).

---

## 4 — WhatsApp admin in repo: inbox, webhook, EC Consult, LLM, team workflow

### Admin surfaces (`admin.easycasaita.com`)

| Hash route | Purpose |
|------------|---------|
| `#whatsapp` | **Archive inbox** — Nest-received messages (`wa_inbound_messages`), operator reply, journey/intake, Claude **draft** compose/translate (human send) |
| `#whatsapp/live` | **ElevenLabs mirror** — lists conversations via `ELEVENLABS_API_KEY` + `WHATSAPP_LIVE_PHONE_NUMBER_ID` (`whatsapp-live-inbox.service.ts`) |
| `#whatsapp/{connection,templates,canned,analytics}` | API Hub (no Meta callback) |
| `#callbacks` (CRM) | EC-CALLBACKS-1 voice callback queue |

### Inbound processing (Nest)

1. Meta POST → `WhatsAppWebhookController.receive` → `WhatsAppService` → `WhatsAppInboundService.persistNewMessages`.
2. Post-200: default **`WhatsAppJourneyService`** (language list → welcome → buy/sell/Easy Legenda buttons) unless `WA_INTAKE_ENABLED=true` → `WhatsAppIntakeService`.
3. Flags in `load.ts` (all default **off**): `WA_INTAKE_ENABLED`, `WA_CONSULTANT_REPLY_ENABLED`, `WA_CALL_REQUESTS_ENABLED`, `WA_TRANSLATE_ASSIST_ENABLED`.
4. **No** ElevenLabs KB sync, **no** Message 1/2 verbatim KB §13, **no** F1–F8 scanner for autonomous replies.

### “EC Consult” naming in repo

- **Training / product truth:** `docs/ec-chat-train-1.md`, `docs/ec-consult-kb-omnichannel-v1.1.md` → ElevenLabs agents + KB IDs `u3uED8EeEjWCpdXZK05z`, `Rjd2JDRoArsWMHvcQn4T`.
- **Intake `consultantBotAction`:** scripted lead capture after first consultant message — **not** the omnichannel EC Consult model (`apps/api/src/whatsapp/intake/machine.ts`).
- **Claude assist:** `WhatsAppClaudeClient` + `whatsapp-ai.service.ts` — operator-initiated drafts only; partial T04 fences in `whatsapp-ai.prompts.ts` (not KB §8–§9 allowlists).

### LLM / STT clients present

| Client | Use | Autonomous WhatsApp send? |
|--------|-----|---------------------------|
| `WhatsAppClaudeClient` (Anthropic) | Operator compose + inbound EN translate | **No** |
| `WhatsAppLiveInboxService` (ElevenLabs REST) | Read/send on **live** number when archive phone id matches live id | Send only when configured; today team uses for templates `ec_request_followup` / `ec_callback_permission` |
| Python `services/ai` | Portal AVM / embeddings | **Not** wired to WhatsApp |
| STT for WA voice notes | **Not implemented** in Nest |

### How the team works chats today (6605)

Per `docs/whatsapp-channel.md` + `ec-chat-train-1.md`: **customers text 6605 → ElevenLabs agents reply.** Staff use **`#whatsapp/live`** to read EL conversation history and optionally send approved templates. **`#whatsapp`** archive is for the **Easycasaita** WABA line, not 6605, unless webhook is repointed.

---

## 5 — Text callback → same Callbacks inbox as voice (`whatsapp_text`)

### Voice path today (implemented)

- Webhook: `POST /api/voice/callbacks/webhook` (`callbacks.webhook.controller.ts`).
- HMAC: `ELEVENLABS_WEBHOOK_SECRET`.
- Stores `crm.voice_calls` + `crm.callback_requests`; CRM contact `source` = **`whatsapp_voice`** (`callbacks.service.ts`).

### Text path (not implemented)

- No `whatsapp_text` in `crm.contacts_source_chk` (`0081_voice_callbacks.sql`).
- No text-ingest handler parallel to `CallbacksService.ingest`.
- **Phase B design intent:** new intake flow writes **one** `callback_requests` row, `source` / channel field `whatsapp_text`, same owner alerts as voice — requires migration + module hook (out of Phase 0 scope).

---

## 6 — Phone-number webhook override (6605)

Cannot confirm without Graph token. Check in survey output:

- Field `webhook_configuration` on `GET /1448737268325965` (override URL vs WABA-level callback).
- WABA-level: subscribed apps list shows which app owns `messages`.

**Repo expectation:** After 22 Nov 2026, **no** mundida.com webhook; ElevenLabs is the messaging consumer. Nest URL `https://easycasaita.com/api/whatsapp/webhook` should **not** appear on 6605 until Phase A subscribe — if it does, that is misconfiguration.

---

## Deploy gate (overlay)

| Requirement | Status |
|-------------|--------|
| API changes ship via image rebuild | **Satisfied** — `docs/deploy.md`, `docs/callbacks.md` explicitly forbid overlay-only API deploys; Traefik file is `infra/docker-compose.traefik.yml` (`azm-keep-overlay-*` pattern). |
| Keeper name policy | Docs say keepers stay `azm-keep-overlay-*`, not `easycasa-ita-api-*` overlays. |

No Phase A deploy performed in this PR.

---

## Templates likely needed on WABA `1139868405295155` (for Phase A/B planning)

Already in repo for **live** line (see `docs/runbooks/wa-templates.md`, `ec-call-permission.json`):

- **`ec_callback_permission`** — 12 languages (UTILITY + `CALL_PERMISSION_REQUEST`) for “ask to call on WhatsApp”.
- **`ec_request_followup`** — corpus `EC_WA_templates_v1.json` (live inbox operator send outside 24h).

**Still to define for EC Consult text (Claude copy, not in repo):**

- Re-open 24h window / session closed nudge (if any).
- Post-callback confirmation template matching KB §12 “Richiamata” (voice uses session text when window open).
- Any marketing category templates are **out of scope** (brief §5).

Run `node scripts/meta-waba-6605-survey.mjs` after token grant to diff **approved** vs **missing** languages.

---

## Blocked / needs a human

1. **`META_6605_TOKEN`** on a secure host — run Graph survey and paste JSON (redact if shared).
2. **Subscribe Easy Casa Italy app** to WABA `1139868405295155` without unsubscribing ElevenLabs (Phase A).
3. **Claude:** disable ElevenLabs messaging on 6605 only at cut-over.
4. **Confirm VPS `WHATSAPP_PHONE_NUMBER_ID` last4** matches Easycasaita line, not 6605.
5. **Product:** approve Phase A/B after reviewing this survey.

---

## Phase 0 deliverable files (this PR)

| File | How to open |
|------|-------------|
| `docs/azm-deliverables/EC-CONSULT-TEXT-1/phase-0-survey.md` | This report |
| `docs/azm-deliverables/EC-CONSULT-TEXT-1/STATUS.json` | Machine-readable lifecycle |
| `scripts/meta-waba-6605-survey.mjs` | `node scripts/meta-waba-6605-survey.mjs` |

**STOP — await AZM go before Phases A/B.**