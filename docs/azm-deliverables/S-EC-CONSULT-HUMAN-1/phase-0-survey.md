# S EC CONSULT-HUMAN-1 — Phase 0 survey (STOP)

**Task:** S EC CONSULT-HUMAN-1 · EC Consult — human opening, short replies, AI-first call ladder, Corso Asta  
**Brief:** v2 · 28 Nov 2026 · Claude Desktop (`CURSOR_CONSULT_HUMAN_OPENING_CALL_LADDER_v2.md` — **not committed** in this repo at survey time)  
**Scope:** Phase 0 only — survey and report; **no product code changes.**  
**Repo base:** `origin/main` @ `f8709fe902eef897bb88bc91019da810ec595fcc` (merge PR #286, 28 Nov 2026)  
**Builds on:** EC-CONSULT-TEXT-1 v2 (`apps/api/src/ec-consult/`, migration `0082_ec_consult_6605.sql`, deliverable `docs/azm-deliverables/EC-CONSULT-TEXT-1/`)

## Executive summary

| # | Phase 0 question | Answer |
|---|------------------|--------|
| 1 | Message 1/2 today | `planFirstContactReply` in `first-contact/engine.ts` → copy from `fixtures/message-copy.fixture.json` (KB §13 shape). Greeting → M1; language digit / “info” → M2; menu-miss ladder. **Live 6605 still ElevenLabs** until cut-over; Nest path is dry-run by default. |
| 2 | Short-reply gate | Extend `runOutputGate` in `output-gate/gate.ts` (same pass as `scanBanned` / `scanLinks` / price scan), invoked from `EcConsultOrchestratorService.finish` before send. |
| 3 | Callback paths | **Voice:** `CallbacksService.ingest` → `crm.callback_requests`. **Text:** `EcConsultCallbackService` in-memory only; `__CALLBACK_INTAKE__` not resolved; **not** unified. Migration `0082` adds `whatsapp_text` + `ingest_source` + nullable `voice_call_id` — Drizzle insert not wired yet. |
| 4 | Scuolavideo enrolment | **No read-only lookup** in EasyCasa. Price/link only via synced KB + allowlist. `course_status` field **does not exist**. |
| 5 | Prior AI voice call on 6605 | `crm.voice_calls` by `caller_number` / `conversation_id` (ElevenLabs webhook). **No** link from `ec_consult.contact_state.wa_id`. `#whatsapp/live` mirrors EL history. No `ai_call_offered_at` yet. |
| 6 | Corso Asta URL per language | Repo + fixtures: **`https://scuolavideo.com` only** (no locale paths). KB v1.1 doc lists languages on-platform; per-language deep links **not in repo** — pull from ElevenLabs KB v1.3 §4 at sync time. |
| 7 | Translated callbacks / Voice Desk | EasyCasa: `#callbacks` admin, `GET/PUT /api/desk/voice-callbacks`, `ec_callback_permission` on WABA `1139868405295155`. **AYNI Voice Desk UI not in this repo.** Non-IT → Italian desk + `waiting_translation_6605` is **not implemented**. |
| 8 | KB sync | `EcConsultKbSyncService.syncFromElevenLabs` fetches `u3uED8EeEjWCpdXZK05z` + **`Rjd2JDRoArsWMHvcQn4T`**. **No cron**; `firstContact` snapshot stored but **unused** in orchestrator. Fixture v1.2 until `ELEVENLABS_KB_READ_KEY` on VPS. After v1.3: stop default §13 fetch when `consult_human_v1` on. |

---

## 1 — Where Message 1/2 are sent and what disabling breaks

### Send path (Nest, when enabled)

```
Meta webhook POST /api/whatsapp/webhook
  → EcConsultWebhookService.ingest (phone_number_id 1448737268325965)
  → EcConsultOrchestratorService.handleInbound
  → planFirstContactReply (first-contact/engine.ts)
  → finish → runOutputGate → dry-run log or Graph send (not implemented in orchestrator yet)
```

| Trigger | Outbound | State transition |
|---------|----------|------------------|
| `firstContactStep === 'none'` + greeting / short text | **Message 1** (`message1Text()`) | → `menu_sent` |
| `none` + `info_without_ask` | **Message 2** (detected or default locale) | → `welcome_sent` |
| `none` + `clear_question` | `__MODEL__` (stub / future Gemini) | → `welcome_sent` |
| `menu_sent` / `menu_retry_sent` + valid digit/name | **Message 2** for locale | → `welcome_sent` |
| First menu miss | M1 retry | → `menu_retry_sent`, `menuMissCount=1` |
| Second menu miss | `MENU_MISS_CALLBACK_IT_EN` (`fences.ts`) | `menuMissCount=2` |
| Third miss | **no outbound** (empty array) | stuck unless user sends new intent |
| `welcome_sent` + route `1`/`2`/`3` | Scripted routes; `3` → `__CALLBACK_INTAKE__` | — |

### Copy source

- **Message 1 / 2 strings:** `apps/api/src/ec-consult/fixtures/message-copy.fixture.json` via `copy/load-message-copy.ts`.
- **Tests lock verbatim M1:** `apps/api/src/ec-consult/ec-consult.spec.ts` cases 1–3.
- **Archived KB doc:** `KB_FIRST_CONTACT_ID = Rjd2JDRoArsWMHvcQn4T` — synced into `EcConsultKbSyncService.firstContact` but **not read** by first-contact engine (fixtures are authoritative in code today).

### What changes when Message 1/2 are disabled (planned `consult_human_v1`, default OFF)

| Area | Break / replace |
|------|-----------------|
| `first-contact/engine.ts` | Replace greeting branch with human-opening strings (IT/EN/bilingual unknown); remove M1/M2 sends; new states (`opening_sent`, …). |
| `classify-inbound.ts` | Today treats short text as `greeting` → M1; must allow direct questions without menu. |
| `menu-parse.ts` | Only needed for legacy flag rollback. |
| `ec-consult.spec.ts` | Cases 1–3 rewritten; keep fence/gate/callback field tests. |
| `message-copy.fixture.json` | Becomes rollback-only behind flag. |
| KB sync | Brief: §13 merged into `u3uED8EeEjWCpdXZK05z` v1.3 §13; **drop default fetch** of `Rjd2JDRoArsWMHvcQn4T` when human opening live. |
| Output gate | Human openings must pass new length/structure rules. |
| Ops / training | `docs/ec-chat-train-1.md` still describes M1/M2 — update after cut-over. |

### Production today (unverified in this agent)

Per `docs/ec-chat-train-1.md` and EC-CONSULT-TEXT-1 Phase 0: **6605 inbound still consumed by ElevenLabs**, not Nest auto-reply (`EC_CONSULT_LINE_ENABLED=false`). Nest webhook can parse 6605 if Meta delivers and `WHATSAPP_6605_APP_SECRET` verifies.

---

## 2 — Where length / structure check can sit

Current pipeline in `EcConsultOrchestratorService.finish`:

1. Planned text (fixture, fence, or model).
2. `runOutputGate(text, locale, kbCanonical)` — banned tokens (`output-gate/claims.json`), allowed links, KB-derived € amounts.
3. On hit → replace with safe fallback (callback offer).

**Recommended extension (Phase 1):**

| Check | Location | Notes |
|-------|----------|-------|
| Max ~450 chars | New `scanLength` in `output-gate/gate.ts` | Run inside `runOutputGate` after bans |
| No numbered menus / “reply 1,2,3” | New `scanStructure` | Regex + deny list; human opening must not reintroduce M1 pattern |
| One `?` / one question | `scanStructure` | Reject multi-question chains |
| One link | Already `scanLinks` | Enforce count ≤ 1, not just allowlist |

Optional: **pre-model** system prompt (`system-prompt.md`) + **post-model** gate (same function) so Gemini cannot bypass.

**Not present today:** char cap, structure ban, `ai_call_offered_at`, funnel events, `consult_human_v1` flag in `load.ts`.

---

## 3 — Callback creation paths and single service?

| Path | Entry | Persistence | CRM `#callbacks` |
|------|-------|-------------|------------------|
| **Voice** | `POST /api/voice/callbacks/webhook` → `CallbacksService.ingest` | `crm.voice_calls` + `crm.callback_requests` | Yes |
| **Text (planned B1)** | `EcConsultCallbackService.ingest` | In-memory array in API process | **No** |
| **Text (menu “3”)** | `kind: callback_route` → text `__CALLBACK_INTAKE__` | Would send literal placeholder today | No |
| **Desk** | `GET/POST /api/desk/voice-callbacks/*` | Same store as voice | Yes (read/update) |
| **Output gate fallback** | Italian “risponda con 3” | No row | No |

**Unified service:** Brief requires **one** human-gate callback creator. Today **only** `CallbacksService.insertCallback` writes the inbox. Phase 1 should:

1. Add `CallbacksService.ingestTextCallback(fields, waId)` (or extend store) setting `ingest_source='whatsapp_text'`, `voice_call_id` null, `whatsapp_wa_id` set (columns in `0082`).
2. Wire orchestrator `callback_route` + AI ladder step 3 to that method — remove `EcConsultCallbackService` in-memory store or delegate to it.
3. Expand allowed fields per brief (lead card: Corso Asta status, file uploaded, etc.) — today text intake allows only six keys (`ec-consult-callback.service.ts`).

Shared package copy: `packages/shared/src/voice-callbacks.ts` (ack/confirm messages; no Banks4All).

---

## 4 — scuolavideo.com course enrolment lookup (read-only)

**Finding: not in EasyCasa repo.**

- References: `output-gate/gate.ts` allowlist, `first-contact/engine.ts` static route copy, fixture KB “Corso Asta scuolavideo.com: 150 euro”.
- No HTTP client, API key, or webhook from Scuola Video.
- No `course_status` on `ec_consult.contact_state` or CRM.

**Phase 1 options for AZM:**

1. Manual / desk-only field on callback row until Scuola Video API documented.
2. Read-only integration (separate brief): match email/phone against Scuola Video LMS — **out of scope** for this repo survey.
3. Text bot asks self-declaration (`unknown` / `not_bought` / `bought` / `completed`) — aligns with brief; no verification.

**Gate rule (brief):** experts’ auction meeting **after** course; **first free Easy Legenda file not gated** — not enforced in code.

---

## 5 — Detecting a prior AI voice call on 6605

| Signal | Where | Usable for ladder step 1 skip? |
|--------|-------|--------------------------------|
| ElevenLabs conversation | `crm.voice_calls.conversation_id`, `elevenlabs_url` | If `caller_number` matches WhatsApp `wa_id` (E.164 digits) |
| Webhook payload | `parse-event.ts` — `callback_requested`, duration | Same |
| Live inbox | `WhatsAppLiveInboxService` + `mergeInboxSources` | Read-only history when `EC_CONSULT_INBOX_SOURCE=webhook` |
| WhatsApp **call** events | `EcConsultWebhookService` **drops** `messageType === 'call'` | No storage |

**Gaps:**

- No query `findRecentVoiceCallByWaId(waId)` in ec-consult or callbacks layer.
- No `ai_call_offered_at` on contact state (brief field).
- CRM link uses **phone** on voice row; WhatsApp id is digits without `+` — normalize before match.

**Recommended (Phase 1):** On each inbound text, `CallbacksStore.findLatestCallByCallerDigits(waId)` within N days; set `ai_call_offered_at` from call end or first ladder offer.

---

## 6 — Real Corso Asta URL per language

| Source | URL pattern |
|--------|-------------|
| `docs/ec-consult-kb-omnichannel-v1.1.md` §4 | `scuolavideo.com` — languages listed as product copy, **no paths** |
| Fixtures `FIXTURE-KB-v1.2-canonical.txt` | `scuolavideo.com` + 150 euro |
| `output-gate` allowlist | `https://scuolavideo.com` (+ subpaths allowed by prefix rule) |
| ElevenLabs KB v1.3 §4 (live, not in repo text) | AZM: authoritative — **survey must re-read after sync** |

**Action for AZM / Claude:** Export §4 from doc `u3uED8EeEjWCpdXZK05z` into fixture on first successful sync; add locale-specific links to allowlist if KB contains them (e.g. `/it/...`, `/en/...`).

---

## 7 — Translated callbacks on 6605 ↔ AYNI Voice Desk

### In **this** repo (EasyCasa)

| Piece | Location |
|-------|----------|
| Callback inbox UI | `apps/admin` → `#callbacks` (`CallbacksShell.tsx`) |
| Routing by language + line | `crm.callback_routing`, desk `GET/PUT …/routing` |
| Default number | `EASY_CASA_VOICE_E164` = `+393793306605` |
| Call permission templates | `apps/api/src/whatsapp/ec-call-permission.json`, `scripts/submit-ec-call-permission.mjs` |
| WABA | `1139868405295155`, phone id `1448737268325965` |
| SIP / voice AI | Documented in `docs/ec-consult-kb-omnichannel-v1.1.md` (ElevenLabs SIP); not Nest |
| Desk auth | `DESK_TO_EASYCASA_SECRET` → Bearer on `/api/desk/voice-callbacks` |

### Not in this repo

- **AYNI Voice Desk** client (line tab, Meta calling UI, template status).
- `waiting_translation_6605` queue flag.
- Bridging 6605 to a second physical line (brief: **without** bridging).

### What translated human callbacks need (checklist for AZM + Desk repo)

1. **`ec_callback_permission`** approved per language on WABA `1139868405295155` (script lists status).
2. WhatsApp **Allow voice calls** on 6605 (historically enabled per omnichannel doc).
3. Callback row carries `callback_language` ≠ `it` → routing still lands Italian desk; desk UI shows **AI-translated call** pending (not live on 6605 human bridge today).
4. Optional: CRM tag / status `waiting_translation_6605` on `callback_requests` — **column not in schema**.
5. No Banks4All / credit fields (F5 unchanged).

---

## 8 — KB sync status (EC-CONSULT-TEXT-1 blocker)

| Item | Status |
|------|--------|
| Service | `EcConsultKbSyncService` (`ec-consult-kb-sync.service.ts`) |
| Canonical doc id | `u3uED8EeEjWCpdXZK05z` — fixture `FIXTURE-KB-v1.2-canonical.txt` (v1.3 live in ElevenLabs, not in fixture yet) |
| First-contact doc id | `Rjd2JDRoArsWMHvcQn4T` — **ARCHIVED** per brief; still fetched on sync today |
| Env gate | `ELEVENLABS_KB_READ_KEY` — missing → fixtures, `missingEnv`, `canSend=false` |
| Hourly sync (brief §4.1) | **Not implemented** — no `@Cron`, no worker; only manual `syncFromElevenLabs()` |
| Hash change safety | `kbUsable()` false until `markTestsPassedAfterHashChange()` (tests in CI) |
| `firstContact` snapshot | Populated on sync, **never consumed** by orchestrator |
| Postgres | `ec_consult.kb_snapshots` in `0082` — **not wired** to sync service (in-memory only) |

**Unblock live sync:** Provision restricted ConvAI read key on VPS per `docs/env.md` + `docs/azm-deliverables/EC-CONSULT-TEXT-1/STATUS.json`.

**CONSULT-HUMAN-1 follow-up:** On v1.3, parse §13 human-opening strings from canonical doc; gate pricing on §4 Corso Asta 150 €; remove dependency on archived doc when `consult_human_v1=true`.

---

## Phase 1 implementation map (no code in this PR)

| Brief rule | Primary touchpoints |
|------------|---------------------|
| Flag `consult_human_v1` OFF, dry-run | `apps/api/src/config/load.ts`, `.env.example` |
| Human opening copy | New `human-opening.ts` or KB-driven loader; branch in `planFirstContactReply` |
| Short replies | `output-gate/gate.ts` |
| AI-first ladder + `ai_call_offered_at` | `ec-consult-memory.store.ts`, orchestrator, CRM optional |
| Human gate + lead card | `CallbacksService` text ingest; replace `EcConsultCallbackService` |
| Corso Asta | KB sync §4; optional self-reported `course_status` on state |
| Funnel events | New table or `callback_events` — **not surveyed in detail** |
| Tests §8 brief | Extend `ec-consult.spec.ts` + gate unit tests |

---

## R&D FEEDBACK — for Claude (summary)

See PR body. Brief file absent from repo — Phase 0 used task text + EC-CONSULT-TEXT-1 deliverables + code survey.

**Blocked / human:** `META_6605_TOKEN` + `ELEVENLABS_KB_READ_KEY` on agent/VPS for live Graph + KB verification; Scuola Video enrolment API owner; AYNI Voice Desk repo for item 7 UI; per-language Corso Asta URLs from KB v1.3 export.