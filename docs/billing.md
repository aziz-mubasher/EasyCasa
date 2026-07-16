# Billing, Featured & Partners (Phase 5)

## Payments are Stripe-hosted
No card data ever touches our servers. We create **Checkout** sessions and redirect;
Stripe handles PCI. The **Customer Portal** manages upgrades/cancellations. Webhooks are
**signature-verified** using the raw request body (`rawBody: true` in `main.ts`).

### Subscriptions (memberships)
- `GET /billing/plans` (public) — plan catalogue (seeded: free/basic/pro/agency).
- `POST /billing/checkout` `{ planKey }` → `{ url }` — subscription Checkout with
  `automatic_tax` and `tax_id_collection` (collects **P.Iva/VAT** for EU invoicing).
- `POST /billing/portal` → `{ url }` — manage the subscription.
- Webhook `POST /billing/webhook` updates `memberships` on
  `checkout.session.completed` and `customer.subscription.updated|deleted`.

### Featured listings (one-time)
- `POST /featured/checkout` `{ listingId, days }` → `{ url }` — one-time payment; the
  webhook creates a `featured_placements` row and sets `listings.featured_until`.

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
