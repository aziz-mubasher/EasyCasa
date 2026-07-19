# Phase 25 — Owner Enquiries Inbox

**Goal:** supply-side UI for the Phase 24 funnel. Owners and mediators triage inbound leads, advance the lifecycle, and convert qualified enquiries into orders.

---

## What it does

- **Inbox** (`app/(owner)/enquiries.tsx`) — inbound enquiries split into **Needs attention** (`NEW` / `CONTACTED` / `QUALIFIED`) and **Converted & closed**.
- **Actions** mirror the Phase 24 state machine; **Convert** calls `/enquiries/:id/convert` (Phase 24 `OrdersBridge` → real Phase 10 order).
- **Owner home** links to the inbox with a **NEW** count badge.
- **Inbound API** returns enquiries where the actor is `ownerUserId` **or** `mediatorUserId`.

---

## Files

```
apps/mobile/
  src/api/enquiries.ts                      # + inbound / transition / convert hooks
  src/components/owner/EnquiryStatusPill.tsx
  src/components/owner/EnquiryCard.tsx
  app/(owner)/enquiries.tsx
  src/i18n/locales/enquiry-inbox.{en,it,es}.json
```

---

## Caveats

- Triage list only — no per-enquiry detail / reply thread yet.
- No realtime push invalidation (refetch on action).
- Order deep-link from the convert alert is a follow-up.
