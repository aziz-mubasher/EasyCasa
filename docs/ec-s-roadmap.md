---
title: EasyCasa — Private Seller Track (EC-S)
version: 3
supersedes: "Google Doc «EC-S Roadmap v2 — Private Seller Track (T01–T33)» and docs/ec-s-roadmap.md"
incorporates: "Cursor accomplishment report, 2026-09-07, main @ 4fcff89"
state: PONTE
valid_from: 2026-09-07
expires_when: licence_state != PONTE
review_owner: "[[BUCO: nome di una persona]]"
counsel_status: not-reviewed
---

# EasyCasa — Private Seller Track

**v3 · 7 September 2026.** Replaces the v2 roadmap in full and absorbs Cursor's accomplishment report of the same date.

Companion documents, none of which this one restates:

- `CLAUDE.md` (Repo Constitution v2) — the three licence states, the two switch-on rules, entity identity, APE
- `claude/AZM_EC_AYNI_1_Brief.md` — the five PRs that build `LicenceState`, the `PERIMETER` registry, the pricing gate, APE, `LEGAL_ENTITY`
- `docs/ec-b-roadmap.md` (Buyer Promise Roadmap v2) — the three axes, the four ledger states, the `retracted` state
- `docs/legal/T04_mediazione_boundary.md` — the 12-row boundary matrix, counsel-unverified

Engineering close-out of T01–T33 is not re-audited here. **Completion is no longer the axis.** The governing question is whether the built thing is lawful and honest in `PONTE`.

The first dispatchable honesty pass is **EC-S-34**. Human record of the ten claims after that pass: [`docs/ec-s-claims-register.md`](./ec-s-claims-register.md). Lead-routing census: [`docs/audits/EC-S-lead-routing-census.md`](./audits/EC-S-lead-routing-census.md).

---

## 1. The finding that reorders the track: this is the Homepal product

CCIAA Milano sanctioned **Homepal** in 2019 ex art. 8 L. 39/1989 for having *«svolto **di fatto** attività di mediazione, dietro compenso»*. Homepal's model mapped onto `main` (T01, T06–T09, T18, T26–T29, catalogue `FULL_MEDIATION` / `BUYER_MEDIATION` 2,49 %, `OFFER_DRAFTING`).

Three consequences:

1. **The fixed fee is not the defence.** The CCIAA vademecum: *«La provvigione può essere prevista secondo un importo percentuale **oppure fisso»*. T04 row 8 is necessary and not sufficient. The norm is art. 2 c. 4 L. 39/1989.
2. **P1's traceability row is inverted.** T26/T27 are seller-paid. That does not sustain «zero commission»; it is the Homepal comparison.
3. **Enrolment does not clean the back catalogue.** Cass. 33183/2024: enrolment must exist at the time of the negotiations. Stamp `licence_state_at_creation` now (EC-S-38).

⚠️ Homepal announced an appeal; outcome not found. Highest-value verification; needs a lawyer with archive access.

---

## 2. Lead routing (not in the T01–T33 report)

`docs/billing.md` Phase 5 describes `PartnersService.routeLead`: a buyer message is scored and assigned to a region-matched partner. On a private seller's listing that is *messa in relazione* performed by the platform.

**Census (EC-S-36, 2026-09-07):** the API is live and unflagged; the product path does not call it; production tables are empty. Full answers: `docs/audits/EC-S-lead-routing-census.md`. Removal is §11.2, not the census.

---

## 3. Three axes, not one

| Axis | Question | Where it lives |
|---|---|---|
| **Promise state** | Does the product do this today, provably? | `promises.json` → `state` |
| **Licence state** | Is the company permitted to do it at all right now? | `licence_state` (DB, default `PONTE`) → `licence_state[]` on the promise |
| **Claim gate** | Is the string allowed to render? | the `PERIMETER` registry (EC-AYNI-1 PR 2) |

Additions to `promises.json` (EC-S-35; no new mechanism): `retracted`, `licence_state[]`, enforcement bound to `PERIMETER`. Until then the register is the retracted record; the shipped page uses existing `hidden`.

---

## 4. T01–T33 on the licence axis

**Ponte-safe — keep:** T01, T06, T07, T08, T10, T12, T13, T14, T16, T18, T19, T19.1, T19.2, T21, T22, T23, T30, T31, T32.

**Ponte-hostile or needing scope:** T09 (keep range, strip verdict — EC-S-41), T11 (draft the seller confirms), T15 (abuse only), T24 (observed demand or blocked — EC-S-41), T26/T27/T29 (fork §11.1), T28 (EC-S-42), T33 (EC-S-43).

APE: 118 published listings. Null energy indices are EC-AYNI-1 PR 4 / §11.4.

---

## 5. The promise ledger, restated

See [`docs/ec-s-claims-register.md`](./ec-s-claims-register.md) for keys, proof paths, and corrections against this table.

| Promise | v2 state | New state | Licence | Task |
|---|---|---|---|---|
| **P1** Zero commission | live | **retracted** (`hidden` until EC-S-35) | all | EC-S-34 · blocked by G1 |
| **P2** OMI guidance | live | **live, rewritten** | all | EC-S-34 (copy) · EC-S-41 (flag) |
| **P3** Verified Owner | live | **live, scoped** | all | EC-S-34 (scope) · EC-S-44 (ops) |
| **P4** Verified buyers | live | **coming** | all | EC-B-17 |
| **P5** Viewings | live | **live** | all | — |
| **P6** Checklist | live | **live** | all | — |
| **P7** Analytics | live | **live**, empty state later | all | EC-S-39 |
| **P8** Control & data | live | **retracted** (`hidden` until EC-S-35) | all | Gate 0 |
| `savingsFigures` | live | **retracted** | all | EC-S-34 with P1 |
| `mediazioneCopy` | live | **retracted** | all | EC-S-34 |

`brand.tagline` («agenzia regolare» / «licensed agency» / «agencia regulada») still renders. That is §11.3, not the copy pass.

---

## 6. Gate 0

**EC-S-34** — honesty pass. Brief executed as three PRs. No features, no flag changes, no chip flipped to `live`.

**GDPR-S** — informativa `v1.1` cannot stand as a settled controller version. P8 retracted. Consent recording continues.

**PK-7 reopened** — `counsel_status: not-reviewed`. `docs/audits/EC-S-34-pk7-reopened.md`.

---

## 7. Residuals

| Residual | Task | Kind |
|---|---|---|
| P7 empty-state copy | **EC-S-39** | eng, copy only |
| Bunny purge-on-erase (`easycasa1.b-cdn.net`) | **EC-S-40** | eng — do not invent `cdn.easycasaita.com` |
| Partner directory 7/7 own desk | **EC-S-42** | restructure, not outreach |
| First VO case | **EC-S-44** | ops — Ibrahim / Silvana |
| PK-5–PK-8 `PENDING Claude`, PK-1/PK-4 invented codes | **EC-S-45** | board hygiene, AZM/Claude only |
| External counsel | Gate 0 · PK-7 reopened | human |
| `.env.example` defaults `false` | — | correct as-is |

---

## 8. New tasks

**EC-S-34** honesty pass — this dispatch.  
**EC-S-35** seller ledger onto `PERIMETER`.  
**EC-S-36** lead-routing census — this dispatch, separate PR.  
**EC-S-37** APE at publish (AYNI PR 4).  
**EC-S-38** `licence_state_at_creation` on seller rows (AYNI PR 1).  
**EC-S-39** P7 empty state.  
**EC-S-40** Bunny purge on erase.  
**EC-S-41** T09 deviation flag + T24 nudge wording.  
**EC-S-42** partner directory restructure.  
**EC-S-43** JSON-LD publisher gate on `LEGAL_ENTITY.status`.  
**EC-S-44** first VO case (ops).  
**EC-S-45** board hygiene (AZM/Claude only).

---

## 9. Sequencing

```
EC-S-34 honesty pass ─── dispatchable NOW ──┐
EC-S-36 census (read-only) ─── NOW ─────────┤
                                            ▼
                         §11.1 revenue fork ──► T26/T27/T29
AYNI PR1 LicenceState ──► EC-S-38
AYNI PR2 PERIMETER   ──► EC-S-35
AYNI PR3 pricing (G1) ──► P1 may be reconsidered
AYNI PR4 APE          ──► EC-S-37 ──► §11.4
AYNI PR5 LEGAL_ENTITY ──► EC-S-43 ──► P8 returns after incorporation
```

---

## 10. Board codes

Confirm free before opening cards (done against `status-ledger.json` 2026-09-07: **1.59 and 7.7 were free**). Buyer track proposed `K EC 1.57/1.58` and `K EC 7.5/7.6` the same day — those were also absent from the ledger; do not invent further codes.

| Task | Proposed Kaizen | Category | DMAIC |
|---|---|---|---|
| EC-S-34 honesty pass | `K EC 1.59` | Sales | Improve |
| EC-S-36 lead-routing census | `K EC 7.7` | Operations | Measure |
| EC-S-35 ledger onto PERIMETER | `K EC 1.60` | Sales | Control |
| EC-S-41 grade wording | `K EC 7.8` | Operations | Improve |

One code, one agent. Do not bundle the honesty pass with the census.

---

## 11. Open — not Cursor's

**11.1** Seller-side revenue in `PONTE` (keep / advertising only / nothing from the seller until the patentino). `FULL_MEDIATION` / `BUYER_MEDIATION` / `OFFER_DRAFTING` are out under all three (G1 / AYNI PR 3).  
**11.2** Lead routing — if live, it comes off regardless. Census: API live, never fired.  
**11.3** Which claim is the company? Portal vs licensed agency.  
**11.4** 118 published listings without energy performance kWh.  
**11.5** Counsel. PK-7 reopened.  
**11.6** Partner directory: subappalto or own-desk.

---

## 12. Refused on this surface

T04 rows 10–12. Percentage or sale-contingent fees. *Sanabilità* or generated legal-risk conclusions. A derived «above/below market» figure. Key custody. Producing the APE. Unredacted third-party data from uploaded documents. Any claim naming a legal entity while `LEGAL_ENTITY.status = PRE_INCORPORATION`.

---

*Engineering and compliance constraint document. **Not legal advice.** T04 counsel verdicts for rows 1–8 and 10–12 remain unchecked; the Homepal appeal outcome is unverified.*
