# `/agenzie` claims register — 15 September 2026

Human record for the agencies landing. Machine ledger: `apps/web/src/config/agenzie/promises.json`.
Do not fork `validate-promise-ledger.mjs` (that file owns Sell Privately P1–P8).

**T04:** row 6 (buyer badge — **retracted** on this page), row 8 (flat fee only). Rows 10–12 remain refused.
**T04 engineering rule 4:** no fee as a percentage of, or contingent on, a sale — and no per-contact charge (messa in relazione).

States: `live` · `coming` · `hidden` (not rendered). `retracted` is this register, not a ledger enum.

---

## A. Ledger rows (the four §3 overclaims)

| Id | Claim (was live copy) | Ledger | Why |
|---|---|---|---|
| **A1** | Every listing is verified | `coming` | VO FSM exists; `verified_owner_case` was 0; publish is not gated. Hero no longer states this as fact. |
| **A2** | Every listing declares a real mandate | `coming` | `mandates` is the service-order incarico, not a listing publish flag. Pact rule stays. |
| **A3** | Duplicates are blocked | `coming` | PK-6 image-dup is seller-path. Agency XML / listing-level duplicates unproven. |
| **A4** | Authentic listings only / energy class + index | `coming` | 92/118 listings lacked both fields. R4 as agency protection is the later brief row. |

Rendered on the page as four labelled tiles (`claims.items.A1–A4`) with sell-privately-style chips.

---

## B. Copy that shipped in this pass (not ledger rows)

| Claim | State | Notes |
|---|---|---|
| Agency identified (VAT + REA on the page) | `live` | Benefit 05 rewritten to this. The real moat. |
| Never per contact, never per closed deal; if we charge, published flat fee | `live` | Benefit 03 + honest item 3 + hero pill. Legal constraint written as the commercial line. |
| You contract with Mundida S.r.l. | `live` | Honest item 2 + form counterpart. Homio 9-contract vs capogruppo still open. |
| Pilot is time-bounded; end date in writing before any charge | `live` (process) | No calendar date invented. AZM still sets the date. |
| Viewings booked through EasyCasa | `live` | Replaces «EasyCasa client viewings». |
| `/en/for-agencies` | `live` | 301 from `/en/agenzie`. IT/ES keep `/agenzie`. |

---

## C. Retracted (must not return)

| Claim | Why |
|---|---|
| Buyers with verified budget / status, band, validity | Reserved-act attribution + art. 22 person-score. Same defect as `/for-buyers`, worse here (sold to a regulated professional). |
| Show homes only to people who can actually buy | Person-filter sold as a feature. |
| Budget attestation is from our group / Banks4All | Declared group link + OAM-shaped act. |
| «only status, band and validity reach you» | Confirms a derived verdict, not the buyer’s own document. |
| Buyer delibera / Credit Prime block | **Not this PR.** Waits issuer confirmation + DPIA (brief item 8). |
| Documentary services listino for agencies | Brief item 7 — after prices. |
| R4 told as agency protection | Brief item 9 — after R4 gates publish. |
| Per-lead / featured placement / agency visibility tier | Ponte-forbidden monetisation. Do not build because `routeLead` / `plans.agency` exist. |

---

*Not legal advice. §2, §4 and the pilot end-date of the source brief are for external counsel, not the product owner.*
