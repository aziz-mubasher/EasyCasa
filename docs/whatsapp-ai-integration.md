# WhatsApp + AI integration

Source plan: stakeholder brief 2026-07-30 (`plan-whatsapp-ai-integration.md`).

## Kaizen placement

| Code | System | Category | DMAIC | Role in plan |
|------|--------|----------|-------|--------------|
| **K EC 7.1** | Website / Digital Ecosystem | Operations | Improve | **Phase A–B** — unified `WhatsAppService` (webhook, send, templates, status) + OTP consumer |
| **K EC 8.7** | Follow-Up System | Sales | Improve | **Phase C** — utility templates + viewing 24h/2h WhatsApp reminders |
| **K EC 7.3** | AI Agent | Operations | Improve | **Phases D–E** — Support queue + AI triage (human-send only); deferred |

Pilot = **A → B → C**. Do not start D/E until inbound volume justifies it.

**Inbound reuse (2026-07-31):** do **not** share B4A’s webhook receiver (routing, single app secret, controller/PII). Reuse pattern + triage capability only (“build once, deploy twice”). §7 verified in B4A portals tree — see `docs/azm-deliverables/k-ec-whatsapp-inbound-reuse/`. Recommended next slice (not Full D): thin `messages` consumer + one auto-ack + ops email forward.

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
| **C** | Utility templates + wire `ViewingsReminderScheduler` / viewing + enquiry notifiers | A | This work |
| **D** | Admin Support queue (`support` role) | EC-14 Part 2 (done) | Deferred |
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
