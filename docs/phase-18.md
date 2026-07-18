# Phase 18 — Owner Checkout Payment Step

**Goal:** wire the Phase 16 owner checkout to the Phase 17 payments — show the **fattura total before paying**, take the payment, and only then proceed to the mandate. This turns the checkout from "creates an order" into "creates an order, collects money, and issues an invoice."

Adapted from the Prisma scaffold: preview reuses Phase 17's Drizzle `OrderInvoiceSource` (same builder as issue).

---

## The checkout flow, now with money

```
1. Accept          → createOrder (server recomputes pricing)
2. Payment step    → invoice preview (imponibile + IVA + bollo + total)
                     → Pay → createIntent(DUE_NOW) → confirm with PSP SDK
                     → poll intent → SUCCEEDED (webhook-driven)
3. Mandate         → createMandate → sign (SPID/CIE) or "awaiting legal review"
```

The mandate step is **gated on payment**. The fattura elettronica is issued **after** payment succeeds (Phase 17 webhook → invoicing handler); checkout shows a *preview*, not an issued invoice.

---

## API

```
GET /invoices/orders/:orderId/preview
  → { imponibileTotalCents, impostaTotalCents, bolloCents, needsBollo,
      totaleDocumentoCents, emissionDeadline, riepilogo, … }
```

`PaymentSummary` renders taxable amount, VAT 22%, stamp duty (when applicable), and the total to pay.

---

## Mobile

- `BillingProvider` + `useInvoicePreview` / `useCreateIntent` / `usePaymentIntent`
- `confirmPayment` seam (DEV `dev_secret_*` posts a synthetic webhook so the flow is exercisable)
- Checkout: Accept → preview + Pay → mandate

---

## Honest caveats

- Real PSP React Native SDK still to wire; webhook remains source of truth.
- Signer identity is still a placeholder (`owner@easycasaita.com`).
- Collect `client_fiscal_code` in checkout UI (Phase 17 follow-up).
