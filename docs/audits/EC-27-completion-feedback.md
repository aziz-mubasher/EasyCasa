# EC-27 — completion feedback (for Claude / R&D)

**Date:** 2026-08-15  
**Agent:** https://cursor.com/agents/bc-451e4b9b-1d89-432c-899b-63f27eccfc32  
**PR:** https://github.com/aziz-mubasher/EasyCasa/pull/171  
**Flags:** `ASTE_ANALYSIS_ENABLED` and `PAYMENTS_ENABLED` remain **off** (dual-flag dark).  
**Board:** Kaizen · K EC 9.1 · Operations  

---

## Operator summary

| Item | Status |
| --- | --- |
| Scope | Teaser vs full-report split + Stripe credit packs (1/3/10) |
| Migration | `0066_ec27_aste_credits.sql` |
| Production flags | **OFF** — functional only when **both** aste + payments flags true |
| Merge blockers fixed | CSS `aste-report.css` orphaned `.ar-brand` block; rebase vs `status-ledger.json` |
| G2 / public enable | **Not** this PR |

---

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE

**Implemented**
- Teaser (locked): procedure header, aggregate semaforo, OMI headline via `available` + `omi_range` (never invents `valore_stima`; sconto only when `sconto_reale_pct != null`)
- Full report unlock: 1 credit, atomic/idempotent on `(user, analysisId)`
- Credits tables + ledger + Stripe `checkout.session.completed` grant (`kind=aste_credits`)
- Dual-flag monetisation guard; i18n IT/EN/ES unlock panel
- Stripe test runbook: `docs/audits/EC-27-stripe-test-runbook.md`

**Deviations / follow-up fixes (merge agent)**
- Restored missing `.ar-brand {` after unlock CSS insert (broke `next build`)
- Rebased onto `main`; resolved bridge ledger conflict; skipped stale `pr_open` ledger commit (had wrong PR URL placeholder)

**Skipped (per brief)**
- Prometheus per-analysis LLM cost counter
- EC-28 financing CTA on teaser
- Live Stripe E2E (human Price IDs)

### 2. WHERE THE BRIEF FAILED YOU

| Type | Detail |
| --- | --- |
| Ambiguous | Teaser with only `ASTE_ANALYSIS_ENABLED` — kept full report for eval; monetisation needs **both** flags |
| Missing | Dedicated aste checkout success/cancel URLs — reused `BILLING_SUCCESS_URL` |
| Wrong | Brief said next migration **0060**; repo was at **0065** → used **0066** |
| Fragile | Large `AsteReportPage.tsx` + CSS insert deleted `.ar-brand` selector opening |

### 3. REPO REALITY CHECK

- **Stripe:** reuse `StripeService` + `/api/billing/webhook`; do not invent a parallel payments path
- **OMI teaser:** reuse `aste-report-display.ts` helpers from EC-24-VERIFY
- **Flags:** API + `NEXT_PUBLIC_*` mirrors must flip together on enable; rebuild web
- **Refunds:** v1 manual in Stripe Dashboard

### 4. EFFORT SIGNAL

~1.5× a thin payments brief (UI teaser + credits + webhook + migration). Correct as one PR after CSS/rebase hygiene.

### 5. BLOCKED / NEEDS A HUMAN

1. Create Stripe test products/prices → set `STRIPE_PRICE_ASTE_CREDITS_1|3|10`
2. Point webhook to `/api/billing/webhook`
3. Run `docs/audits/EC-27-stripe-test-runbook.md`
4. Confirm VPS migration **0066** applied (deploy agent)
5. Do **not** flip flags until G2 / `aste-enable.md` (counsel answers due ~2026-08-29)

### 6. NEXT TASK SHOULD ACCOUNT FOR

- G2 enable checklist separate from EC-27 merge
- Prefer (c) Drive GT before charging real users
- EC-28 financing already dark on main — wire into teaser only if product asks
- When enabling: apply 0066 first, then both flags, recreate api+web

---

## Local verify (merge agent)

```
vitest api: credits/teaser/flag-matrix → 11 passed
vitest web: monetisation + display → 9 passed
pnpm --filter @easycasa/web build → OK (after CSS fix)
```
