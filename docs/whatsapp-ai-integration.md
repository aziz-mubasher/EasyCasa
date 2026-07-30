# WhatsApp + AI integration

Source plan: stakeholder brief 2026-07-30 (`plan-whatsapp-ai-integration.md`).

## Kaizen placement

| Code | System | Category | DMAIC | Role in plan |
|------|--------|----------|-------|--------------|
| **K EC 7.1** | Website / Digital Ecosystem | Operations | Improve | **Phase A–B** — unified `WhatsAppService` (webhook, send, templates, status) + OTP consumer |
| **K EC 8.7** | Follow-Up System | Sales | Improve | **Phase C** — utility templates + viewing 24h/2h WhatsApp reminders |
| **K EC 7.3** | AI Agent | Operations | Improve | **Phases D–E** — Support queue + AI triage (human-send only); deferred |

Pilot = **A → B → C**. Do not start D/E until inbound volume justifies it.

## Architecture

```
WhatsApp Cloud API
    ↕  webhook · send
NestJS WhatsAppService
    ├─ verification   → users.phone_verified_at (EC-12)
    ├─ notifications  → viewings, enquiries, orders
    └─ conversations  → AI triage → admin Support queue
```

## Sequencing

| Phase | What | Depends on | Status |
|-------|------|------------|--------|
| **A** | `WhatsAppModule`: Cloud client, webhook verify + status ingest stub, template send facade | — | Done (`#64`) |
| **B** | OTP consumer via shared service — wamid / fallback_reason persistence, runbook | A, EC-12 | This work |
| **C** | Utility templates + wire `ViewingsReminderScheduler` to WhatsApp | A | Next |
| **D** | Admin Support queue (`support` role) | EC-14 Part 2 (done) | Deferred |
| **E** | AI triage → queue drafts (no autonomous send) | A, D | Deferred |
| **F** | Grounded assistant | E + real conversation data | Deferred |

## Phase B acceptance

- [x] OTP uses `WhatsAppService` only (no parallel Cloud client)
- [x] Challenge stores `provider_message_id` / `fallback_reason`
- [x] Unit tests cover WhatsApp success + email fallback
- [x] Runbook: `docs/runbooks/whatsapp-otp.md`
- [ ] VPS `WHATSAPP_*` credentials + Meta auth template approved (ops)


- 24h service window — free reply only after user message; else templates only.
- Auth + Utility templates only — **no marketing templates**.
- AI never auto-sends; never answers privacy/DSAR, complaints, listing reports, or mediation advice.
- AI is an audited API actor (EC-11 gates), not a DB process.

## What to measure (Phase C+)

- Reminder → no-show rate
- Escalation accuracy on forbidden categories
- False-confidence sampling on drafted replies
