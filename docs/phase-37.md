# Phase 37 — Seeker Pilot Flow (sealed backend + seed) + Frontend Spec

**Goal:** make the one seeker path — search → listing → enquiry → viewing —
complete, un-stubbed, and testable, and give the seeker map real data.

---

## The pilot path

| Step | Endpoint | Auth | Email side-effect |
| --- | --- | --- | --- |
| 1. Search | `POST /search/bounds` | public | — |
| 2. Listing detail | `GET /listings/:slug\|:id` | public | — |
| 3. Enquiry | `POST /listings/:id\|:slug/enquiries` | seeker | seeker confirmation + owner notification |
| 4. Book viewing | `POST /listings/:id\|:slug/viewings` | seeker | — (REQUESTED) |
| 5. Confirm viewing | `POST /viewings/:id/confirm` | conductor | viewing confirmation to seeker |

No Nest `/api` prefix (Traefik strips it). Bounds body requires `zoom`.

---

## Landed in this repo

```
apps/api/src/email/providers/outbox-email.provider.ts   # audit trail; wraps selected port
apps/api/src/pilot/seed/**                              # curated Milan set + Drizzle/Meili sink
apps/api/src/pilot/pilot.module.ts                      # POST /admin/pilot/seed
apps/api/test/pilot/reference-app.ts                    # executable journey CONTRACT
apps/api/test/pilot/seeker-journey.e2e.spec.ts
apps/api/test/integration/seeker-journey.int.spec.ts    # real AppModule + Postgres + Meili
apps/web/.../ContactEnquiryForm.tsx                     # Contatta CTA → enquiry
```

### Adaptations vs scaffold

- Drizzle (not Prisma); upsert on synthetic negative `wp_post_id` from `wpKey`.
- `NOTIFY_FROM` (not `EMAIL_FROM`); real route shapes + `zoom` on bounds.
- Viewing confirmation email on **CONFIRM**, not on book (matches `ViewingsService`).
- Viewings controller resolves `UsersService.getOrCreate` (UUID FKs, not OIDC `sub`).
- Listing id **or** slug accepted on enquiry / viewing routes.

### Outbox

`EmailModule` wraps the selected provider with `OutboxEmailProvider`. Operators:
`GET /admin/email-outbox` (admin role).

### Pilot seed

`POST /admin/pilot/seed` — idempotent. Full WordPress ETL remains the catalogue source.

---

## Frontend checklist (remaining)

- [x] Contact-agent CTA → enquiry (wired; DEV_AUTH headers until web PKCE)
- [ ] Viewing booking UI (slot picker)
- [ ] Saved search + alerts UI
- [ ] Seeker “my enquiries / viewings / saved searches”
- [ ] Web PKCE auth (Phase 35 client)

---

## Validation

```bash
pnpm --filter @easycasa/api test          # includes contract e2e + outbox + seed
pnpm --filter @easycasa/api test:int      # Docker — seeker-journey.int.spec.ts
```
