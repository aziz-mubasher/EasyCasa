# Phase 10 — Transactional Seam: Orders + Mandate (Incarico)

**Goal:** turn an accepted quote into a persisted **order**, then a **mandate (*incarico*)** the owner signs — the point where the platform commits money and a legal relationship. Delivered as NestJS modules over the Phase 8 pricing engine, plus a Phase 10 `@easycasa/api-client` surface.

> **Repo note:** EasyCasa uses **Drizzle** + SQL migrations under `migration/sql/` (not Prisma). Phase 10 fields live in `0009_phase10.sql` and `apps/api/src/db/schema.ts`.

Design reference: `docs/system-design.md` §5.2 (mediazione vs mandato) and §6 (Mandate entity).

---

## Two principles this phase is built around

1. **No hardcoded legal call.** Whether a service is *mediazione* (neutral, provvigione on conclusion) or *mandato a titolo oneroso* (paid instruction of one party) changes how a fee may lawfully be charged. That determination is **admin-configured data**, not code: each catalog item carries a `legalBasis` that **defaults to `REVIEW_REQUIRED`**. `deriveMandate()` collects the figures an order implies and lists any unreviewed item; **a mandate cannot be sent while that list is non-empty**. New services are fail-safe by default.

2. **EasyCasa never signs for anyone.** The signature provider (FEA/QES with SPID/CIE identity) hosts the signing flow. The system creates an envelope and returns a `signingUrl`; the **owner authenticates and signs there**; the provider calls our webhook. No signature is ever fabricated server-side.

Also: **pricing is recomputed server-side** on order creation — the client's totals are never trusted; persisted lines are exactly what the Phase 8 engine returns.

---

## What's in the repo

```
apps/api/src/
  transactions/domain/            # pure, framework-free, fully tested
    types.ts  legal-basis.ts  state.ts  ports.ts
    legal-basis.spec.ts  state.spec.ts
  orders/                         # Drizzle repos + Phase8PricingAdapter
  mandate/                        # derive → gate → envelope → webhook
migration/sql/0009_phase10.sql
packages/api-client/src/phase10.ts
apps/web/app/[locale]/admin/legal-basis/
apps/mobile/ … owner services accept → mandate → sign
```

---

## API surface

```
POST /properties/:id/orders          → create order (server recomputes pricing)
GET  /orders/:id                     → order with lines
POST /mandates                       → draft mandate for an order (derives legal basis)
GET  /mandates/:id                   → mandate incl. types + reviewRequiredItems + status
POST /mandates/:id/signature-request → { signingUrl }  (409 if review incomplete)
POST /webhooks/signature             → provider callback → marks SIGNED (HMAC x-signature)
GET  /admin/catalog/legal-basis      → items + reviewRequiredCount
PATCH /admin/catalog/:code/legal-basis
```

## Lifecycles (enforced by the state machines)

```
Order:   QUOTED → CONFIRMED → IN_PROGRESS → COMPLETED     (CANCEL until COMPLETED)
Mandate: DRAFT → SENT → SIGNED                            (WITHDRAW / EXPIRE from SENT)
         └ SEND is refused unless canProceed (review complete)
```

---

## Acceptance criteria

- [x] `deriveMandate` / `resolveOrderItemCodes` — domain unit tests.
- [x] Mandate + order state machines — domain unit tests.
- [x] Nest layer (orders + mandate + Drizzle adapters) wired in AppModule.
- [x] `@easycasa/api-client` Phase 10 surface (`EasyCasaTransactionsApi`).
- [x] Migration `0009_phase10.sql` + Drizzle schema.
- [x] Admin legal-basis screen + webhook HMAC verification.
- [x] Owner checkout: accept quote → order → mandate → sign or awaiting review.
- [ ] Live FEA/QES vendor credentials in production `.env`.

---

## Honest caveats

- **Legal classification is unset by default.** Every catalog item is `REVIEW_REQUIRED` until an admin (with counsel) sets `MEDIAZIONE` or `MANDATO_ONEROSO`. **Until then, mandates draft but cannot be sent** — intentional.
- **Stub envelopes** when `SIGNATURE_PROVIDER_URL` / `KEY` are empty (dev). Production must configure a real provider.
- **Webhook auth:** `POST /webhooks/signature` verifies `x-signature` = HMAC-SHA256(hex) of the raw body when `SIGNATURE_WEBHOOK_SECRET` is set; required outside `DEV_AUTH`.
- **The mandate document itself** (PDF) is assumed generated upstream and passed as `documentUrl`; templating it is a follow-up.
