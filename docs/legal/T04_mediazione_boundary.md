# EC-S-T04 — Portal vs. Mediazione Boundary Document

**Status:** TEMPLATE FOR COUNSEL REVIEW — becomes binding internal policy only after counsel approval.  
**Entity:** Mundida S.r.l. / Mundida group (P.IVA IT04531990986) — EasyCasa (easycasaita.com)  
**Purpose:** Define, feature by feature, what EasyCasa may do for private sellers without becoming a *mediatore* under L. 39/1989 (as amended by L. 57/2001; agente immobiliare requirements, REA registration, *provvigione* entitlement under artt. 1754–1755 c.c.). Once approved, this matrix is the **acceptance criterion for tasks T20–T29** and all Phase S5 work.

**Paired packet:** Claim 2 in [`ec-s-t02-counsel-review-packet.md`](./ec-s-t02-counsel-review-packet.md) (copy gate `blocks.mediazioneCopy.state`).  
**Existing tension:** [`mediation-disclosure.md`](./mediation-disclosure.md) still templates EasyCasa as a licensed mediator — counsel must reconcile with this matrix before either document is treated as final.

---

## Legal frame (for counsel confirmation)

- **Art. 1754 c.c.:** *mediatore* is who *"mette in relazione due o più parti per la conclusione di un affare"* without being bound by relationships of collaboration, dependency or representation.
- **Case law (e.g. Cass. 19161/2017 line):** *provvigione* entitlement can arise from *de facto* mediazione — **activity, not labels, controls**. A "we are not an agency" disclaimer does not immunise conduct that constitutes *messa in relazione* with intervention in the deal.
- **Working hypothesis to confirm:** a **bacheca/portale** that limits itself to hosting listings and providing neutral tools (scheduling, data display, messaging transport) does not perform mediazione; the risk zone is any activity that *facilitates the conclusion of the specific deal* (transmitting offers, suggesting prices to accept, negotiating terms).

**Counsel confirms frame:** ☐ as written · ☐ with amendments: _______________

---

## Boundary matrix

| # | Activity | Verdict (proposed) | Rationale / conditions | EC-S tasks |
|---|----------|--------------------|------------------------|------------|
| 1 | Host owner listings, photos, documents | ✅ Allowed | Pure hosting; seller authors content | T07, T10, T13 |
| 2 | Display OMI zone ranges next to asking price | ✅ Allowed | Publication of official statistical data; must render as data, never "we suggest you price at X" | T08, T09 |
| 3 | Price-position analytics & nudges (T24) | ⚠️ Conditional | Permitted if phrased as market data about the listing's own metrics; prohibited if phrased as advice to accept/set a specific price | T23, T24 |
| 4 | Viewing scheduler, slots, confirmations (T21–22) | ✅ Allowed | Calendar tooling; no EasyCasa involvement in what parties discuss | T21, T22 (core live: EC-3–7) |
| 5 | Seller↔buyer messaging transport (T25) | ✅ Allowed | Transport only; EasyCasa must not read/intervene in negotiations (moderation limited to abuse/safety) | T25 |
| 6 | Display buyer financial badge on enquiry (T20) | ⚠️ Conditional | Display of a third-party (group) attestation; EasyCasa makes no solvency representation. Confirm no "presentation of a ready buyer" recharacterisation | T20 (badge live: EC-1) |
| 7 | Verified Owner / document checklist (T14, T18) | ✅ Allowed (confirm) | Anti-fraud verification of the *listing*, not brokerage of the *deal* | T14–T18 |
| 8 | Featured listings, premium tier (T26–27) | ✅ Allowed | Advertising services, flat-fee, success-independent. Condition: never price a service as % of sale or contingent on sale | T26, T27 |
| 9 | Partner referrals: notaio/geometra/APE (T28) | ⚠️ Conditional | Flat referral, clearly labelled; confirm no *segnalatore/procacciatore* registration issues per category | T28, T29 |
| 10 | Collecting/transmitting expressions of interest or offers (S5) | ❌ Prohibited (until S5 counsel gate) | Core *messa in relazione* territory; do not build | — |
| 11 | *Proposta d'acquisto* templates, *caparra* handling (S5) | ❌ Prohibited (until S5 counsel gate) | Transaction intermediation; separate counsel review + possible licensing route required | — |
| 12 | Advising either party on negotiation strategy | ❌ Prohibited | Includes AI features: the AI service must refuse deal-specific negotiation advice | T11 (AI descriptions), analytics |

### Counsel verdict per row

| # | Approve proposed? | Amended verdict / conditions |
|---|-------------------|------------------------------|
| 1 | ☐ yes ☐ no ☐ amend | |
| 2 | ☐ yes ☐ no ☐ amend | |
| 3 | ☐ yes ☐ no ☐ amend | |
| 4 | ☐ yes ☐ no ☐ amend | |
| 5 | ☐ yes ☐ no ☐ amend | |
| 6 | ☐ yes ☐ no ☐ amend | |
| 7 | ☐ yes ☐ no ☐ amend | |
| 8 | ☐ yes ☐ no ☐ amend | |
| 9 | ☐ yes ☐ no ☐ amend | |
| 10 | ☐ yes ☐ no ☐ amend | |
| 11 | ☐ yes ☐ no ☐ amend | |
| 12 | ☐ yes ☐ no ☐ amend | |

---

## Engineering rules derived (once approved)

1. Every **T20–T29** task brief cites the matrix row(s) it touches; ⚠️ rows carry the stated conditions as acceptance criteria.
2. **Copy rule:** EasyCasa tools are described as things the *seller does* ("publish your slots", "your price vs. zone data"), never things EasyCasa does *to the deal*.
3. **AI guardrail:** description generation and analytics must not emit price recommendations or negotiation advice (rows 3 / 12) — add to FastAPI prompt constraints and test fixtures (`services/ai`).
4. **Payment rule:** no fee anywhere in the product may be computed as a percentage of, or contingent on, a sale (row 8). Catalogue `legal_basis` / Stripe amounts must stay flat or otherwise success-independent unless a separate licensed *mediazione* path is opened.
5. Any feature idea touching rows **10–12** requires a written counsel opinion before a task brief is created.

Until this document is counsel-approved, Sell Privately **Claim 2** copy stays on ledger `blocks.mediazioneCopy.state = "fallback"` (see T02 packet).

---

## Open questions for counsel

1. Confirm verdicts and conditions per row; amend where case law suggests otherwise.
2. Does the buyer-badge display (row 6) plus scheduler (row 4) *in combination* approach *messa in relazione* even if each is neutral alone?
3. Is a visible *"EasyCasa non svolge attività di mediazione immobiliare"* notice advisable on listing pages, and does its presence help or hurt in a *de facto* analysis?
4. Referral structure in row 9: preferred legal form (flat fee vs. free directory) per professional category.
5. How should [`mediation-disclosure.md`](./mediation-disclosure.md) (licensed mediator template) be rewritten if this matrix is approved as “portal / no mediazione”?

---

## Sign-off

| Field | Value |
|-------|-------|
| Counsel name / firm | |
| Date | |
| Matrix approved as binding internal policy | ☐ yes ☐ yes with amendments attached |
| May flip `blocks.mediazioneCopy.state` → `live` (T02 Claim 2) | ☐ yes ☐ no |
| Listing-page disclaimer required (Q3) | ☐ yes ☐ no — text: _______________ |
| Rows 10–12 stay prohibited pending S5 opinion | ☐ confirmed |

*Not legal advice. Binding only after counsel approval and recording of the sign-off above.*
