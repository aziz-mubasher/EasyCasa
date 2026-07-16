# Phase 5 — Monetisation, Messaging & Partners (checklist)

## Steps & acceptance criteria
- [x] **1. Subscriptions.** Done when: `/billing/checkout` returns a Stripe URL; webhook activates the membership; portal works; VAT/P.Iva collected.
- [x] **2. Featured listings.** Done when: `/featured/checkout` → payment → webhook sets `featured_until` + `featured_placements`.
- [x] **3. Messaging.** Done when: buyers start threads, spam is rejected, rate limits hold, both parties get notified.
- [x] **4. Partner dashboards.** Done when: partners see routed leads (scored), update status, and view payouts.
- [x] **5. Lead routing.** Done when: a new enquiry creates a scored lead assigned to a region-matched partner.
- [x] **6. Notifications.** Done when: in-app notifications list/read works; alerts worker writes saved-search notifications; email/push transports pluggable.

## Verified in this scaffold
- `pnpm --filter @easycasa/api typecheck` ✅ and tests ✅ (14: +lead-score×3, +spam×3)
- `0006_phase5.sql` parses against Postgres grammar ✅
- Stripe integration compiles against real `stripe` types; webhook uses verified raw body.

## Cursor prompts (one PR each)
1. "Create Stripe products/prices for each plan and store price IDs on `plans.stripe_price_id` (script + docs)."
2. "Boost featured listings in search: order by `featured_until > now()` first in both /search and Meilisearch ranking rules."
3. "Build the partner dashboard UI (/partner) — leads table with score, status dropdown, payouts; role-gated."
4. "Build the messaging UI: conversation list + thread view + composer, calling /conversations endpoints."
5. "Wire NextAuth/OIDC so billing/messaging calls send the bearer token (ties to Phase 2 auth)."
6. "Add SMTP transport (nodemailer) behind the NotificationsService email transport with templates (IT/EN/ES)."
7. "Add Stripe Connect for partner payouts and generate monthly `payouts` rows."

## Guardrails
- Never handle card data — Stripe Checkout/Portal only; verify webhooks by signature.
- Messaging mutations check participant membership; keep spam + rate limits on.
- Lead scoring stays transparent/explainable.
