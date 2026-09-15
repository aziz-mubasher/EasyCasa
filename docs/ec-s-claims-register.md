# EC-S claims register

**Date:** 2026-09-15  
**After:** EC-SELL-PRIVATELY-1 (P4 retracted; `retracted` + `licence_state[]` on the ledger).  
`PERIMETER` (EC-AYNI-1 PR 2) is still absent — company state is `companyLicenceState` on `promises.json`. Do not fork `validate-promise-ledger.mjs`; keep it in sync with `promiseLedger/index.ts`.

Ledger file: `apps/web/src/config/sell-privately/promises.json`.  
Page: `/{it,en,es}/vendi-da-privato` (and localized slugs).  
Licence column is the set of company states in which the **claim** may be made. `PONTE` is current.

**Corrections to roadmap v3 §5 (repo, not brief):**

| Brief said | Repo |
|---|---|
| `home.subtitle` carries «agenzia regolare» | That key **does not exist**. The licensed-agency string is `brand.tagline`. `home.hero.subtitle` is a different sentence (verified owner / «dal venditore non prendiamo un euro»). See `docs/legal/AYNI_STATE_AUDIT.md` §1. |
| `footer.disclosure` announces *provvigione* | That key **does not exist**. Closest live keys: `footer.blurb`, `pricing.disclosure`, `footer.entity`. Left rendering (roadmap §11.3). |
| Mark P1 / P8 / blocks `retracted` in `promises.json` | Forbidden in this task (EC-S-35). Shipped as **`hidden`**, which already omits the tile and both counsel blocks. This register is the retracted record. |
| FAQ would fall with the tiles | FAQ is **not** ledger-gated. Honesty pass deleted the free/commission and GDPR items so they could not keep rendering. |

---

## Ten ledger rows

| Promise | Ledger (`promises.json`) | Register | Licence | i18n (it/en/es same keys) | Backing | Proof if live |
|---|---|---|---|---|---|---|
| **P1** Zero commission | `retracted` | **retracted** | all | leftover `benefits.items.P1.*` | EC-S-34 · replaced by P9+P10 in PONTE | — |
| **P2** OMI guidance | `live` | **live** | all | `how.steps.price.*` | T08+T09 | Zone range only. Never a sotto-mercato verdict. |
| **P3** Ownership checked | `live` | **live, renamed** | all | `how.steps.verify.*` · FAQ ownership | T14–T17 | Optional document check. `verified_owner_case` last counted **0** (2026-08-15). |
| **P4** Verified buyers | `retracted` | **retracted** | all | leftover `benefits.items.P4.*` (not rendered) | EC-SELL-PRIVATELY-1 | Not delayed — will not ship as a person badge / Banks4All financial badge. Replacement is P12. |
| **P5** Viewings | `live` | **live, promoted** | all | `how.steps.viewings.*` | EC-3–7 · T21/T22 | Seller-conducted. Central product. |
| **P6** Checklist | `live` | **live** | all | `how.steps.docs.*` | T18 | Linked to paid DOC_CHECKUP. |
| **P7** Analytics | `live` | **live** | all | leftover tile copy | T23 | No metric that judges a person. |
| **P8** Control & data | `retracted` | **retracted** | all | leftover `benefits.items.P8.*` | Gate 0 | — |
| **P9** Publishing is free | `live` | **live** | ponte, agente, oam | money band · costs | EC-SELL-PRIVATELY-1 | LISTING_PUBLICATION €0. |
| **P10** No commission either side | `live` | **live** | **ponte only** | money band · FAQ | EC-SELL-PRIVATELY-1 | Review at month 12. Catalog FULL_MEDIATION remains an AYNI contradiction. |
| **P11** Energy figures required | `live` | **live** | all | APE section | R4 same PR | Class + index at every publish path. |
| **P12** Buyer’s own pre-approval | `coming` | **coming** | all | ready section (coming copy) | PR D | Credit Prime + DPIA still open. |
| `savingsFigures` | `retracted` | **retracted** | all | `savings.*` (not mounted) | EC-S-34 | — |
| `mediazioneCopy` | `retracted` | **retracted** | all | `not.*` (not mounted) | EC-S-34 | Perimeter copy is now in-page (`never` + footer). |

---

## Off-ledger keys on the same page

Every remaining `sellPrivately.*` key. Hidden leftovers stay in the message files so a silent re-add of a tile does not restore the old Homepal wording.

| Key | State | Licence | Notes |
|---|---|---|---|
| `meta.title` / `meta.description` / `meta.keywords[]` | live | all | Fee / savings keywords removed. Title no longer «senza provvigione». |
| `schema.serviceName` / `serviceType` / `offerDescription` | live | all | JSON-LD. «Portale» / «no commission» offer text removed. Publisher gate is EC-S-43. |
| `counselTemplate` | unused | — | Not rendered. Left in all three locales. |
| `tags.live` / `tags.coming` | live | all | Chip labels. `coming` is only valid when a roadmap task exists (P4; how-step `list` is a pre-existing exception). |
| `hero.title` / `lead` / `ctaPrimary` / `ctaSecondary` | live | all | Lead no longer claims agency tools without a fee. CTA reused («Crea il tuo annuncio gratis»). |
| `savings.*` (11 keys) | retracted | — | Neutralised leftovers. Not mounted while the block is `hidden`. |
| `how.kicker` / `how.title` | live | all | |
| `how.steps.list.*` | **coming** (hardcoded) | all | Bound to `fallbackStatus: 'coming'` with `promiseId: null` in `sell-privately.ts`. T07/T13 are built; chip still says coming. Not flipped in this pass (no chip → `live`). |
| `how.steps.price.*` | live | all | P2. Range only. |
| `how.steps.verify.*` | live | all | P3 scoped. |
| `how.steps.buyers.*` | coming | all | Follows P4. Mundida group name stripped. |
| `how.steps.viewings.*` | live | all | P5. |
| `benefits.kicker` / `title` / `sub` | live | all | |
| `benefits.items.P1.*` | retracted | — | Neutralised leftovers; tile hidden. |
| `benefits.items.P2–P7.*` | see table above | all | P4 coming chip. |
| `benefits.items.P8.*` | retracted | — | Neutralised leftovers; tile hidden. |
| `not.*` | retracted | — | Portal / «we are not an agency» block unmounted. |
| `faq.kicker` / `faq.title` | live | all | |
| `faq.items[0]` documents | live | all | P6. |
| `faq.items[1]` Verified Owner | live, scoped | all | P3. |
| `faq.items[2]` who sees documents | live | all | Moderation only. |
| `faq.items[3]` Verified Buyer | coming | all | P4 + Banks4All, no group entity. |
| `faq.items[4]` list with an agency | live | all | No exclusivity / no mandate. |
| *(removed)* «is it free?» / «how is my data protected?» | retracted | — | Deleted in all three locales so they cannot render. |
| `final.title` / `body` / `cta` | live | all | Fee / savings language removed. |
| `foot.privacyBefore` / `privacyLink` / `privacyAfter` | live | all | Version token and controller name removed. Link to `/legal/privacy` remains. |
| `foot.myData` | live | all | `/privacy` DSAR. |
| `foot.mediation` | live | all | Nav label to `/legal/mediation`. Does not assert portal-vs-agency. Page body of that route is out of this PR (do not edit `mediation-disclosure.md`). |
| `foot.legal` / `foot.privacyVersion` | removed | — | Keys deleted in all three locales. Named `MUNDIDA S.r.l.` / P.IVA and a settled version number. |

Site chrome **not** on this page and **not** changed: `brand.tagline`, `home.hero.subtitle`, `footer.blurb`, `footer.entity`, `pricing.disclosure`. Recorded as the other half of the `mediazioneCopy` contradiction (roadmap §11.3).

---

## How to read a chip

`visiblePromiseEntries` drops `hidden`. A `coming` chip is a promise with a task. A `soon` chip on a claim we may never be permitted to make is forbidden — that is why P1/P8 are `hidden`, not `coming`.
