# Billing, Featured & Partners (Phase 5)

## Payments are Stripe-hosted
No card data ever touches our servers. We create **Checkout** sessions and redirect;
Stripe handles PCI. The **Customer Portal** manages upgrades/cancellations. Webhooks are
**signature-verified** using the raw request body (`rawBody: true` in `main.ts`).

### Subscriptions (memberships)
- **T27 note:** the billing rail already supported subscriptions before T27 —
  `createSubscriptionCheckout` has always used `mode: 'subscription'`, and the
  webhook already handled `checkout.session.completed` +
  `customer.subscription.updated|deleted` into `memberships`. T27 reuses this
  rail unchanged; it does not extend Stripe integration, it only adds a
  parallel `seller_subscription` row (see below) and the `seller_premium`
  plan definition.
- `GET /billing/plans` (public) — plan catalogue (seeded: free/basic/pro/agency + T27 `seller_premium`).
- `POST /billing/checkout` `{ planKey }` → `{ url }` — subscription Checkout with
  `automatic_tax` and `tax_id_collection` (collects **P.Iva/VAT** for EU invoicing).
- `POST /billing/portal` → `{ url }` — manage the subscription.
- Webhook `POST /billing/webhook` updates `memberships` on
  `checkout.session.completed` and `customer.subscription.updated|deleted`.
- **T27:** the same webhook also upserts `seller_subscription` (`status`,
  `current_period_end`, `cancel_at_period_end`). Entitlements / quota raises
  read **only** this local row — never live Stripe. Freshness bound ≈ Stripe
  webhook delivery SLA (typically seconds; worst case until the next
  `customer.subscription.updated`). `SELLER_PREMIUM_ENABLED` must be true for
  raises to apply; plan prices are flat-fee fixed EUR (not listing-contingent).

### Featured listings (one-time)
- `POST /featured/checkout` `{ listingId, days }` → `{ url }` — **T26:** `days` must be **7 or 30**; flat-fee EUR (`BOOST_FLAT_PRICE_CENTS` / optional Stripe Price IDs). Gated by `LISTING_BOOST_ENABLED`.
- Webhook creates `listing_boost` (+ legacy `featured_placements`) and patches Meili `boostWeight`.
- Refund (`charge.refunded`) cancels the boost and clears ranking weight.
- Unpublish pauses remaining time; republish resumes. Flag off hides purchase UI but still honours active boosts.

### Partner directory placement (PP-1, one-time)
- `POST /partners/directory/apply` — partner claims a directory row (one per user).
- `GET /partners/directory/me` — partner's row + `checkoutAvailable` (plan has Stripe Price).
- `POST /partners/directory/checkout` → `{ url }` — flat-fee placement; gated by `PARTNER_DIRECTORY_ENABLED`.
- Webhook `checkout.session.completed` with `metadata.kind=partner_directory` sets `paid_placement=true` (perpetual; idempotent via `stripe_payment_id`).
- Admin manual `paid_placement` on `PATCH /admin/partner-directory/:id` remains the offline fallback.
- Plan key `partner_directory_placement` — config-driven Stripe Price ID (empty until ops backfill).

## Messaging (with spam controls)
- `POST /conversations` `{ listingId, message }` — starts a thread, rejects spam
  (`isLikelySpam`), rate-limits new conversations, notifies the agent, and **routes a lead**.
- `POST /conversations/:id/messages`, `GET /conversations`, `GET /conversations/:id/messages`.

## Lead routing (commission-free model)
When a buyer messages, `PartnersService.routeLead` picks a partner covering the listing's
region and creates a scored `lead` (transparent 0–100 `scoreLead`). Serious leads surface
to partners — reinforcing the no-agency-commission positioning.

## Partner / pro-marketer dashboard
- `GET /partner/dashboard` — leads by status + conversion rate.
- `GET /partner/leads`, `PATCH /partner/leads/:id` `{ status }`, `GET /partner/payouts`.

## Notifications
`NotificationsService.notify(userId, type, payload, channels)` writes in-app rows and
dispatches email/push via pluggable transports (console fallback when unconfigured).
The Phase 4 **alerts worker** now writes `saved_search` notifications directly.
- `GET /me/notifications`, `POST /me/notifications/:id/read`.
