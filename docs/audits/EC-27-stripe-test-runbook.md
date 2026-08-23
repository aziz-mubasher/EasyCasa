# EC-27 — Stripe test-mode E2E (Aste credit packs)

**Scope:** Manual verification before any flag enable. Production stays dark (`ASTE_ANALYSIS_ENABLED=false`, `PAYMENTS_ENABLED=false`).  
**How to test (all lanes):** `docs/runbooks/aste-testing-sop.md`.

## Prerequisites

1. Apply migration `migration/sql/0066_ec27_aste_credits.sql` on a dev database.
2. Set on API (test mode only):

```bash
ASTE_ANALYSIS_ENABLED=true
PAYMENTS_ENABLED=true
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
# Optional — else price_data fallback activates
STRIPE_PRICE_ASTE_CREDITS_1=
STRIPE_PRICE_ASTE_CREDITS_3=
STRIPE_PRICE_ASTE_CREDITS_10=
```

3. Set on web build:

```bash
NEXT_PUBLIC_ASTE_ANALYSIS_ENABLED=true
NEXT_PUBLIC_PAYMENTS_ENABLED=true
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

4. Forward Stripe webhooks to `POST /api/billing/webhook` (Stripe CLI or dashboard test endpoint).

## Happy path

1. Sign in, upload + submit an analysis until `ready`.
2. Open `/[locale]/aste/analisi/{id}/report` — expect **teaser** (procedure header, aggregate semaforo, OMI band; no economics/chat/print).
3. `GET /aste/credits/balance` → `{ balance: 0 }`.
4. Click a pack → Stripe Checkout (test card `4242…`).
5. Complete checkout; webhook `checkout.session.completed` with `metadata.kind=aste_credits` grants credits.
6. `GET /aste/credits/balance` → balance matches pack size.
7. Click **Use 1 credit** (or `POST /aste/analyses/{id}/unlock`) — full report loads; balance −1.
8. Refresh / double-click unlock — no second debit; report stays full.
9. Chat + print available on full report only.

## Flag matrix smoke

| ASTE | PAYMENTS | `/aste/credits/*` | Report |
| --- | --- | --- | --- |
| off | off | 404 | route redirect (prod) |
| on | off | 404 | full (legacy eval) |
| off | on | 404 | N/A |
| on | on | 200 | teaser until unlock |

## Refunds (v1)

Manual via Stripe Dashboard; no admin refund UI in v1.
