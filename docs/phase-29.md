# Phase 29 — Viewings & Scheduling

**Goal:** seeker books a viewing on an available slot; owner/mediator confirms; lifecycle runs to completed / cancelled / no-show. Viewing-intent enquiries can hand off into a booking via `enquiryId`.

Adapted from the Prisma scaffold to **Drizzle** (`migration/sql/0018_phase29.sql`).

---

## Engine

Pure domain (`apps/api/src/viewings/domain/`):

1. **Slot generation** — weekly windows → concrete slots (lead time, horizon, buffer conflicts).
2. **Booking validation** — same rules re-checked server-side.
3. **Lifecycle** — `REQUESTED → CONFIRMED → COMPLETED`, with `CANCEL` / `NO_SHOW`.

Defaults: 45-min slots, 15-min buffer, 2h notice, 30-day horizon.

---

## API

```
GET  /listings/:id/slots?from&to     → Slot[]              (@Public)
POST /listings/:id/availability      { windows }           (owner/mediator)
POST /listings/:id/viewings          { startMs, enquiryId? } (seeker)
GET  /me/viewings
GET  /me/viewings/conducting
POST /viewings/:id/{confirm|cancel|complete|no-show}
```

Conductor = mediator ?? owner. Seeker may cancel; conductor may confirm/cancel/complete/no-show.

---

## Data

| Table | Purpose |
|-------|---------|
| `viewing_availability` | Recurring weekday windows |
| `viewings` | Bookings + status |

Partial unique index on active `(listing_id, start_at)` reduces double-book races.

---

## Client / mobile

- `@easycasa/api-client` → `EasyCasaViewingsApi`
- Expo: `booking/[listingId]` slot picker; listing detail CTA; viewing-enquiry → optional book deep-link

---

## Caveats

- Availability minutes are **UTC** until per-listing IANA tz is added.
- Notifier uses Phase 22 in-app/push transports (fail soft).
- Full seeker “My viewings” / conductor agenda screens are follow-ups (`listMine` / `listConducting` APIs are ready).
