# Stripe test-mode checkout runbook (K EC 1.38)

Use this on a **local or staging** stack with Stripe **test** keys only. Cloud agents cannot run real charges or webhooks.

## Env (API)

```bash
PAYMENTS_ENABLED=true
GO_LIVE_PAYMENTS_ACK=false
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # from `stripe listen` or Dashboard webhook endpoint
PAYMENTS_SUCCESS_URL=http://localhost:3000/it/pagamento/successo
PAYMENTS_CANCEL_URL=http://localhost:3000/it/pagamento/annullato
DEV_AUTH=true                     # or full OIDC for web sign-in
```

## Env (web — rebuild after change)

```bash
NEXT_PUBLIC_PAYMENTS_ENABLED=true
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Webhook forwarding

```bash
stripe listen --forward-to localhost:4000/payments/webhook
```

Copy the `whsec_` signing secret into `STRIPE_WEBHOOK_SECRET`.

**Edge / Traefik:** `POST /payments/webhook` is `@Public()` in the API (no JWT). It must be reachable from Stripe at `https://<domain>/api/payments/webhook` (path after edge strip). Confirm the route is not blocked by auth middleware at the edge — adjust infra if Stripe receives 401.

## Manual verification

1. Set flags + test keys; migrate (`pnpm --filter @easycasa/migration migrate`).
2. Sign in on the web app; open `/it/pricing`.
3. Select a **fixed-fee** item or package (e.g. VALUATION, FAI_DA_TE); request quote.
4. Click **Proceed to payment**; complete checkout with test card `4242 4242 4242 4242`.
5. Confirm webhook logs `payment_intent.succeeded`; `GET /payments/intents/:id` → `SUCCEEDED`.
6. Confirm order status moves to `IN_PROGRESS`; `GET /invoices/orders/:orderId/preview` returns totals.
7. With `PAYMENTS_ENABLED=false`, pricing shows mailto quote only (no pay button).

## Safety

- `sk_live_*` without `GO_LIVE_PAYMENTS_ACK=true` **fails API config load** (process refuses to start).
- Provvigione (`PROVVIGIONE` purpose) and passthrough lines are **rejected** on the card path.
