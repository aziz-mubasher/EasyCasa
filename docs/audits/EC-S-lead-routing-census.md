# EC-S-36 — Lead-routing census

**Date:** 2026-09-07  
**Kaizen:** K EC 7.7 · Operations · Measure  
**Kind:** read-only. No removal, no flag flip, no migration.  
**Repo tip:** `main @ 4fcff89` plus this doc.  
**Production probes:** HTTP against `https://easycasaita.com/api` and `psql` on `easycasa-ita-db-1` via the Traefik-pair compose exec (same method as EC-AYNI-AUDIT-1, same day).

Roadmap v3 §2 asked whether a buyer message on a private seller's listing is scored and handed to a paying third party. Answers below. Removal is a later decision (roadmap §11.2).

---

## Verdict in one paragraph

The legacy `POST /conversations` path is **reachable on production** (auth only; no feature flag). It is the **only** caller of `PartnersService.routeLead`. The seller-track path (`POST /listings/:id/enquiries` + T20/T25 `enquiry-messaging`) runs **beside** it and does **not** call `routeLead`. `/seller/enquiries` uses the enquiry tables only.

In the live database: **0** `partner_profiles`, **0** `leads`, **0** `payouts`, **0** `conversations`. `routeLead` has never persisted a row. Nine `enquiries` exist (last 2026-07-30); none have a `leads` row. `plans.agency` is seeded at €99/month with **no Stripe Price**, so it is not purchasable; nobody holds that membership.

The code path described in `docs/billing.md` is live as an API, unused as a product, and empty as data. That is a finding, not a deletion.

---

## 1. Is `POST /conversations` reachable on production, and behind which flag?

**Yes. No feature flag.**

| Check | Result | Evidence |
|---|---|---|
| Controller | `MessagingController` `@Controller('conversations')` `@RequiresAuth()` | `apps/api/src/messaging/messaging.controller.ts` |
| Module | Always imported in `AppModule` | `apps/api/src/app.module.ts` |
| Flag | None on the controller or `startConversation` | unlike T25, which uses `SELLER_MESSAGING_ENABLED` |
| Production `POST /api/conversations` (no bearer) | **401** `missing bearer token` — route exists | 2026-09-07, `gitSha` `3cc5099` |
| Production `GET /api/version` | `{"service":"api","gitSha":"3cc5099","builtAt":"2026-09-05T07:35:48Z"}` | same probe |

A 404 would mean the route was dark. 401 means it is mounted and gated only on login.

`apps/web/src/lib/billing.ts` still exports `startConversation` → `POST /conversations`. **No web or mobile caller** imports it (rg 2026-09-07). The live listing CTA posts to `/listings/:id/enquiries` (`ContactEnquiryForm.tsx`).

---

## 2. Does T20/T25 `enquiry-messaging` replace it or run beside it? What does `/seller/enquiries` use?

**Beside it.** Two stacks, two tables.

| Stack | Tables | Routes | Flag | UI |
|---|---|---|---|---|
| Legacy agency messaging | `conversations`, `messages` | `POST/GET /conversations`, `POST/GET /conversations/:id/messages` | none | no current page |
| Seller track T20/T25 | `enquiries`, `enquiry_messages` | `POST /listings/:id/enquiries`, `GET /seller/enquiries`, `GET/POST /enquiries/:id/messages` | `SELLER_INBOX_ENABLED` (list) · `SELLER_MESSAGING_ENABLED` (thread; 404 when off) | `/seller/enquiries` (`SellerInboxPanel.tsx`) |

PK-5 recorded this split explicitly: *«Agency `conversations`/`messages` tables remain buyer↔agent only — private-seller uses `enquiry_messages`»* (`docs/audits/EC-S-pk5-pk6-counsel-determinations.md`).

Production: `SELLER_MESSAGING_ENABLED=true`, `SELLER_INBOX_ENABLED=true` (api container `printenv`, 2026-09-07). Unauth `GET /api/enquiries/:id/messages` returns **401**, not 404 — the T25 guard is on.

`/seller/enquiries` calls `GET /seller/enquiries` and `GET/POST /enquiries/:id/messages`. It never calls `/conversations`.

---

## 3. Does `routeLead` fire on the seller-track enquiry path, or only on the legacy `conversations` path?

**Only on the legacy path.**

`PartnersService.routeLead` is called from one place: `MessagingService.startConversation` after the first message (`apps/api/src/messaging/messaging.service.ts`). That method:

1. Writes a `conversations` row (agent = `listings.agentId`)
2. Writes the first `messages` row
3. Calls `routeLead`, which picks a random `partner_profiles` row whose `regions` cover the listing and inserts a scored `leads` row (`source: 'message'`)

`EnquiriesService.create` (T20) notifies the owner (and a mediator if assigned) via `planEnquiryRouting`. It does **not** import `PartnersService`. `EnquiryMessagingService.send` does not either.

So a buyer enquiry on a private listing today does **not** create a partner lead. The same buyer hitting `POST /conversations` (still open) **would**.

---

## 4. How many `partner_profiles`, `leads` and `payouts` rows exist? When was the most recent?

Production `psql`, 2026-09-07:

| Relation | n | Most recent `created_at` |
|---|---:|---|
| `partner_profiles` | **0** | — |
| `leads` | **0** | — |
| `payouts` | **0** | — |
| `conversations` | **0** | — |
| `messages` | **0** | — |
| `enquiries` | **9** | **2026-07-30 16:23:48+00** |

`routeLead` has never written a production row. The partner dashboard (`GET /partner/dashboard`, `/partner/leads`, `/partner/payouts`) is mounted and role-gated (`partner`, `pro_marketer`); there is no web `/partner` page in `apps/web`.

These are the Phase 5 tables in `apps/api/src/db/schema.ts`. CRM `crm.partner_profiles` (migration `0043`) is a different object and is not what `routeLead` reads.

---

## 5. What does `plans.agency` grant, is it purchasable, and has anyone bought it?

**Grants nothing wired. Not purchasable. No buyers.**

| Field | Production value |
|---|---|
| `key` | `agency` |
| `name` | Agency |
| `price_cents` | 9900 (€99 / month) |
| `stripe_price_id` | **null** |
| `features` | `{}` |

Checkout (`StripeService.createSubscriptionCheckout`) refuses any plan without a Stripe Price (`plan not purchasable`). Only `seller_premium` and `partner_directory_placement` have Prices.

`GET /api/billing/plans` is **public** and returns the agency row (probed 200). No web UI calls `startCheckout(token, 'agency')`. Seller premium uses `seller_premium` only.

Entitlements: the Stripe webhook writes `memberships.tier` from `metadata.planKey`, but **only** `seller_premium` feeds `seller_subscription` / quota (`apps/api/src/billing/stripe.service.ts`). Nothing in `apps/` reads `tier === 'agency'`.

`memberships` on production: **1** row, `tier=free`, `status=inactive`. Zero `agency` memberships.

The seed is `migration/sql/0006_phase5.sql` (`free / basic / pro / agency`). `basic` and `pro` are in the same unused-without-Price state.

---

## 6. Does any listing owned by a private seller have a `lead` row?

**No.** `leads` is empty, so no listing of any `seller_type` has a lead.

Related, so it is not mistaken for a lead: the nine `enquiries` join to

| listing `status` | `seller_type` | has `owner_user_id` | n |
|---|---|---|---:|
| archived | `private` | yes | 6 |
| published | null | yes | 3 |

Those are owner-routed T20 enquiries, not `routeLead` rows. Close-out 2026-08-15 already counted 9 enquiries / 1 published listing with enquiry traffic.

Listing mix (all statuses): `seller_type` null **120**, `agency` **30**, `private` **30**.

---

## What this census could not do

- Replay an authenticated `POST /conversations` on production (would create a conversation + a lead). Not done.
- Inspect Stripe for a historical `agency` Price that was later cleared. Current row has `stripe_price_id` null; checkout cannot succeed in this state.
- Count CRM `crm.partner_profiles` (out of `routeLead`'s schema).

---

## Implication (not a change)

If §11.2 decides the path is dead code, deletion is a separate PR. If it decides the path is live risk, it is already the sharper fact: the API is open, unflagged, and will write a partner lead on the first authenticated call — including on a private seller's listing — even though that has not happened yet.

`.env.example` defaults remain `false` for seller flags; do not “fix” them. `SELLER_MESSAGING_ENABLED` is `true` on the VPS and is not part of this finding's removal question.
