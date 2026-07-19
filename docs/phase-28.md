# Phase 28 — "Zero Commission" Messaging Reconciliation

*A positioning decision with light copy/implementation. Do this before AVM/discovery traffic scales: a misaligned promise gets more expensive — and more legally exposed — the more people see it.*

**Deliverable:** this document + repo copy aligned to **Option B** (unbundled transparency). Founder + commercialista still sign off the commercial model (§3); legal review before paid acquisition scale.

---

## 1. The tension

| | What it says / does |
| --- | --- |
| **Historic live claim** | Unscoped "**Zero commission**" / "no agency commission." |
| **What's built (Phases 8–26)** | Licensed mediator + à-la-carte catalog **plus** a **provvigione** on successful mediation (`MEDIAZIONE`), incarico/mandato, buyer-side orders. |

These contradict. Three problems, worst-first: internally false; AGCM / *pubblicità ingannevole* exposure; undersells the real moat (transparent unbundling + compliant transaction spine).

---

## 2. Decision (§3) — pending founder sign-off

1. Does the seller/owner pay a provvigione?
2. Does the buyer pay a provvigione?
3. What's free vs paid in the catalog? (Search, AVM, enquiries free; services paid.)
4. Flat/% mediation fee, or à-la-carte only?

**Build today implies:** paid à-la-carte + provvigione on mediation. Until that changes, unscoped "zero commission" must not appear.

---

## 3. Options (summary)

| Option | Claim style | Fit |
| --- | --- | --- |
| **A** | Scoped "no commission **for sellers**" + footnote | Only if seller fee is truly waived |
| **B** | "Pay only for the services you use" / transparency | **Best fit for what's built** — adopted in repo |
| **C** | "No fixed %" | Only if mediation is not a % |

---

## 4. What shipped in this repo

- Removed remaining "no traditional agency commission" hero lines (EN/IT/ES).
- Hero + tagline → Option B framing (licensed agency + à-la-carte).
- Footer: one-line **provvigione disclosure** + link to **`/[locale]/pricing`**.
- Public **pricing page** driven by `GET /service-catalog` (Phase 8 source of truth).
- Checklist items still open: founder model sign-off, scoped Option A (if ever), legal/AGCM review, paid-acquisition A/B test.

---

## 5. Implementation checklist

- [ ] Decide the model (§3) — founders + commercialista.
- [x] Remove standalone zero / "no agency commission" claims (hero + tagline locales).
- [x] Publish itemised à-la-carte price page (catalog API).
- [x] One-line provvigione disclosure linked from footer / pricing.
- [ ] If scoped "no seller commission" is used, add mandatory footnote everywhere.
- [x] Align public web copy; owner checkout already discloses provvigione maturity.
- [ ] Legal/AGCM-compliance review of final claims.
- [ ] Re-test hero before scaling paid acquisition.

---

*Not legal advice. Viewings/scheduling can proceed independently; this gates marketing scale, not engineering.*
