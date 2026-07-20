# Phase 31 — Schema unification (Drizzle)

**Goal:** Phase 30 backlog item #1 — confirm the schema is migration-ready and resolve the buyer-order root tension the Prisma scaffold surfaced.

This monorepo uses **Drizzle + `migration/sql/*.sql`**, not Prisma. There are no reconciliation stubs to merge: each phase already shipped real SQL (`0001`…`0018`) and tables in `apps/api/src/db/schema.ts`. Phase 31 documents that inventory and ships the **buyer-order** design fix.

---

## What already exists (unified)

| Area | Tables / notes |
|------|----------------|
| Auth / users | `users`, roles via OIDC / `DEV_AUTH` |
| Listings (P21+) | `listings`, media, search indexes |
| Fascicolo (P8) | `properties`, `document_assets` — distinct from `listings` |
| Catalog / orders (P8+10+17) | `service_catalog_items` (+ `legal_basis`), packages, `service_orders` / lines |
| Mandate (P10) | `mandates` |
| Pros (P11) | professionals, credentials, tasks, assignments |
| Rentals / AML (P12) | `leases`, KYC cases |
| Payments / SdI (P17) | payment intents, invoices |
| Discovery (P22–24) | saved searches, alerts, `enquiries` |
| AVM (P27) | `omi_quotes`, valuation requests |
| Viewings (P29) | `viewing_availability`, `viewings` |

`Property` and `Listing` stay distinct (owner compliance vs published inventory), linked by `properties.listing_id` when known.

---

## What Phase 31 adds

```
migration/sql/0019_phase31.sql     # service_orders.property_id nullable + listing_id
apps/api/src/db/schema.ts          # matching Drizzle columns
OrdersService.createForListing     # buyer / enquiry path
Phase10OrdersAdapter               # BUYER → listing root; OWNER → property fascicolo
docs/phase-31.md                   # this file
```

### Buyer vs owner order roots

| Party | Root | Notes |
|-------|------|--------|
| OWNER | `property_id` required | Fascicolo + mandate + pro tasks |
| BUYER | `listing_id` required | No invented Property; professional spawn skipped until a property exists |

DB check: `property_id IS NOT NULL OR listing_id IS NOT NULL`.

---

## Not adopted from the scaffold

- `apps/api/prisma/schema.prisma` — do not introduce Prisma alongside Drizzle.
- `prisma migrate` / fragment deletion — N/A; SQL files remain the migration source of truth.

---

## Follow-ups

1. Optional: set both `property_id` and `listing_id` when an owner order already has `properties.listing_id`.
2. Party columns on `service_orders` (`party_user_id` / `party_role`) — still logged only in the bridge.
3. Seed script for catalog + demo property/listings (ops convenience).
4. Confirm User profile fields against OIDC cutover (Phase 30 backlog #1).
