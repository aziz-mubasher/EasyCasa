# Phase 24 — Enquiry → Order Funnel

**Goal:** connect discovery to the transaction pipeline. The listing "Contact agent" CTA creates a real **enquiry**, routes it to the owner/mediator, and converts a qualified enquiry into a Phase 10 **order**.

Adapted from the Prisma scaffold to **Drizzle** (`migration/sql/0016_phase24.sql`).

---

## Funnel

```
Seeker taps "Contact agent"
  → EnquiryModal → POST /listings/:id/enquiries → Enquiry (NEW)
  → notify owner (+ mediator); follow-up for viewing/offer

Owner / mediator
  → CONTACT → QUALIFY
  → POST /enquiries/:id/convert → Order (Phase 10) + Enquiry (CONVERTED)
```

Conversion is gated: only `QUALIFIED`, non-`info`, not-already-converted enquiries become orders. Draft items: `VIEWING_ACCOMPANIMENT` / `BUYER_MEDIATION` + `OFFER_DRAFTING` (added to the catalog).

---

## API

```
POST /listings/:listingId/enquiries   { intent, message, contactEmail?, contactPhone? }
GET  /me/enquiries
GET  /me/inbound-enquiries
POST /enquiries/:id/transition         { event }
POST /enquiries/:id/convert            → { enquiryId, orderId }
```

Listing parties: `listings.owner_user_id` (backfilled from `agent_id`) + optional `mediator_user_id`.

`OrdersBridge` resolves/creates a `properties` row for the listing, then calls `OrdersService.create` with the draft items.

---

## Client / mobile

- `@easycasa/api-client` → `EasyCasaEnquiriesApi`
- Expo: `EnquiryModal` + wired CTA on `listing/[slug]`

---

## Caveats

- Owner inbox UI and seeker "my enquiries" screens are follow-ups.
- Buyer catalog codes are illustrative fixed/provvigione placeholders.
- Notifier writes in-app + push console transport (same seam as Phase 22).
