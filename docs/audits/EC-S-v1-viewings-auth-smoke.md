# EC-S V-1 — authenticated viewings book/confirm smoke (2026-08-15)

**Authoriser:** AZM via Cursor — *proceed with V-1 authenticated viewings book/confirm smoke*  
**Ops verification:** V-1 (`SELLER_VIEWINGS_ENABLED`)  
**Companion:** `docs/ec-s-post-roadmap-polish.md` §A2 · `docs/ec-s-seller-journey-completion.md` stage 6

## Live state (pre-smoke)

| Check | Result |
|-------|--------|
| Container `SELLER_VIEWINGS_ENABLED` | **true** (flipped 2026-08-14) |
| Unauth `GET /api/seller/viewings/conducting` | **401** |
| `/it/seller/viewings` | **200** |

## Method

No durable `SMOKE_BEARER`. Ephemeral Keycloak confidential client `easycasa-v1-smoke` + two users:

| Actor | Realm role | Job |
|-------|------------|-----|
| Seller | `seller` | Temporary listing owner; set availability; confirm |
| Buyer | `buyer` | Book slot (`seeker` capability) |

Listing: `demo-mb-monza-115` (`f05d1508-…`) — ownership reassigned for smoke, then restored.

## Results

| Step | Result |
|------|--------|
| `POST /api/seller/listings/:id/availability` (7 weekdays 09–18) | **201** `{ok:true}` |
| `GET …/availability` | **200** — 7 windows |
| Public `GET /api/listings/:id/slots` | **200** — 164 slots |
| Buyer `POST /api/listings/:id/viewings` | **201** — status `REQUESTED` |
| Seller `GET /api/seller/viewings/conducting` | **200** — viewing listed |
| Seller `POST /api/seller/viewings/:id/confirm` | **201** — status `CONFIRMED` |
| UI `/it/seller/viewings` + availability page | **200** |
| Cleanup | Viewing cancelled; availability cleared; owner restored; ephemeral KC + users deleted |

Artifact: `/opt/cursor/artifacts/v1_authenticated_viewings_smoke.log` (`V1_SMOKE_COMPLETE … book=201 confirm=201`).

## Verdict

**V-1 auth smoke PASS.** Seller-conducted path is live end-to-end: availability → public slots → buyer book → seller confirm.

## Cleanup notes (for next smoke)

- Availability table is `viewing_availability` (not `listing_availability_windows`).
- Deleting smoke `users` requires `DELETE FROM crm.contacts WHERE user_id=…` first.
