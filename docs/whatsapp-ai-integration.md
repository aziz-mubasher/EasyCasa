# WhatsApp + AI integration

Source plan: stakeholder brief 2026-07-30 (`plan-whatsapp-ai-integration.md`).

## Kaizen placement

| Code | System | Category | DMAIC | Role in plan |
|------|--------|----------|-------|--------------|
| **K EC 7.1** | Website / Digital Ecosystem | Operations | Improve | **Phase A–B** — unified `WhatsAppService` (webhook, send, templates, status) + OTP consumer |
| **K EC 8.7** | Follow-Up System | Sales | Improve | **Phase C** — utility templates + viewing 24h/2h WhatsApp reminders |
| **K EC 7.3** | AI Agent | Operations | Improve | **Phases D–E** — Support queue + AI triage (human-send only); deferred |

Pilot = **A → B → C**. Do not start D/E until inbound volume justifies it.

**Inbound reuse (2026-07-31):** do **not** share B4A’s webhook receiver (routing, single app secret, controller/PII). Reuse pattern + triage capability only (“build once, deploy twice”). §7 verified in B4A portals tree — see `docs/azm-deliverables/k-ec-whatsapp-inbound-reuse/`.

**EC-17 (minimal inbound):** signature-verified `messages` consumer, thin `wa_inbound_messages` persist, one free-form auto-ack per wa_id / 24h. Ops alert is subject-line + admin link by default (`WA_INBOUND_EMAIL_FORWARD=false`); body-bearing mail is legacy opt-in.

**EC-19 (admin viewer):** read-only `GET /admin/whatsapp/inbound` behind `whatsapp:inbound:read`. List returns opaque `waHandle` (HMAC) only — never raw `waId`. Detail by handle is audited. No reply / no join to users or listings.

**EC-19a:** `WA_HANDLE_SECRET` required at boot (Nest secrets list is now **six** — see `docs/env.md`). Rotating it breaks `#whatsapp/<handle>` deep-links only — re-open from the list; log the date in `docs/env.md`. Backfill: `pnpm exec tsx src/whatsapp/backfill-wa-handles.ts` from `apps/api`.

**EC-19b:** `users.phone_e164` (Meta wa_id digits, no `+`) via `toWaId()` — DSAR export/erasure match on equality. Italian landline trunk zero preserved. Live smoke §4 still needs a real phone after deploy.

## Architecture

```
WhatsApp Cloud API
    ↕  webhook · send
NestJS WhatsAppService
    ├─ verification   → users.phone_verified_at (EC-12)
    ├─ notifications  → viewings, enquiries (orders later)
    └─ conversations  → AI triage → admin Support queue
```

## Sequencing

| Phase | What | Depends on | Status |
|-------|------|------------|--------|
| **A** | `WhatsAppModule`: Cloud client, webhook verify + status ingest stub, template send facade | — | Done (`#64`) |
| **B** | OTP consumer via shared service — wamid / fallback_reason persistence, runbook | A, EC-12 | Done (`#66`) |
| **C** | Utility templates + wire viewing/enquiry notifiers | A | Done (`#67`) |
| **EC-16** | Meta template pack (human) + `whatsapp_messages` + no-show metrics | C | This work (`#68`) |
| **D** | Admin Support queue (`support` role) | EC-14 Part 2 (done) | **Partial:** EC-19 read-only inbound viewer. Reply = EC-20. Full queue still deferred |
| **E** | AI triage → queue drafts (no autonomous send) | A, D | Deferred |
| **F** | Grounded assistant | E + real conversation data | Deferred |

## Phase C acceptance

- [x] Viewing reminder / lifecycle + enquiry notifiers call `WhatsAppService.sendTemplate` when configured
- [x] Verified phone gate; empty template env → skip WhatsApp only
- [x] Disclosure: street address on confirmed + 2h reminder only
- [x] Unit tests for body-param / template helpers
- [x] Runbook: `docs/runbooks/whatsapp-utility.md`
- [ ] VPS `WHATSAPP_*` credentials + Meta **utility** templates approved (ops)
- [ ] Order status WhatsApp (no order notifier yet — deferred)

## Rules (all phases)

- 24h service window — free reply only after user message; else templates only.
- Auth + Utility templates only — **no marketing templates**.
- AI never auto-sends; never answers privacy/DSAR, complaints, listing reports, or mediation advice.
- AI is an audited API actor (EC-11 gates), not a DB process.

## What to measure (Phase C+)

- Reminder → no-show rate
- Escalation accuracy on forbidden categories
- False-confidence sampling on drafted replies
