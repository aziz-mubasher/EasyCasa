# Phase 17 — Payments + Fattura Elettronica

**Goal:** charge the owner for order "due now" (and later provvigione) through a PSP, then issue the **fattura elettronica** via the Sistema di Interscambio (SdI).

Adapted from the Prisma scaffold to **Drizzle** (`migration/sql/0013_phase17.sql`). Membership Stripe Checkout remains in `billing/` — this phase is order PaymentIntents + invoicing.

---

## Charge timing

`planCharges` splits lines: **fixed + pass-through now**, **provvigione on deal success**. Matches Phase 8/10 pricing.

## Flow

```
order → createIntent(DUE_NOW) → clientSecret → PSP confirm
  → webhook succeeded → intent SUCCEEDED → issue fattura → SdI → protocollo
deal closes → createIntent(PROVVIGIONE) → … → second fattura
```

## API

```
POST /payments/intents              → { intentId, clientSecret }
GET  /payments/intents/:id
POST /payments/intents/:id/refund
POST /payments/webhook              (PUBLIC)

POST /invoices/orders/:orderId
GET  /invoices/orders/:orderId/preview   (Phase 18 — build-only)
GET  /invoices/:id
```

On `SUCCEEDED`, `InvoiceOnPaymentSucceeded` auto-issues the fattura from real order lines.

## Env

| Var | Notes |
| --- | --- |
| `PSP_API_URL` / `PSP_SECRET_KEY` | Generic PSP seam; DEV_AUTH stubs when empty |
| `SDI_CHANNEL_URL` / `SDI_CHANNEL_KEY` | SdI intermediary; DEV_AUTH stubs protocollo |
| `EASYCASA_PIVA` / `EASYCASA_DENOMINAZIONE` | Cedente (defaults: Easy Casa Ita Srl) |

## Caveats

- PSP / SdI are seams — production needs Stripe (or Nexi) PaymentIntents + signed FatturaPA 1.2.2 XML.
- `client_fiscal_code` is stored on orders but not yet collected in checkout UI.
- Conservazione sostitutiva (10y) out of scope.
- Not tax advice.
