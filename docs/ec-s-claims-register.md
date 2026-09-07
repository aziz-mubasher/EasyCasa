# EC-S claims register

**Date:** 2026-09-07  
**After:** EC-S-34 honesty pass (PR 1)  
**Machine-readable follow-up:** EC-S-35 (`retracted` + `licence_state[]` on `promises.json`, bound to `PERIMETER`). This file is the human record until that ships. Do not fork `validate-promise-ledger.mjs`.

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
| **P1** Zero commission | `hidden` | **retracted** | all — none available in `PONTE` | `benefits.items.P1.*` (not rendered) · hero/meta/schema stripped of fee language | EC-S-34 · blocked by G1 | — |
| **P2** OMI guidance | `live` | **live, rewritten** | all | `benefits.items.P2.*` · `how.steps.price.*` | T08+T09 · copy EC-S-34 · flag EC-S-41 | Wizard OMI panel + `sourceOmi` strings. Page states the published zone range only. |
| **P3** Verified Owner | `live` | **live, scoped** | all | `benefits.items.P3.*` · `how.steps.verify.*` · `faq.items[1]` | T14–T17 · scope EC-S-34 · ops EC-S-44 | VO FSM + badge. Publish is **not** hard-gated. `verified_owner_case` was 0 at 2026-08-15 close-out (not re-counted here). |
| **P4** Verified buyers | `coming` | **coming** | all | `benefits.items.P4.*` · `how.steps.buyers.*` · `faq.items[3]` | EC-1 · EC-B-17 | Buyer page already `Verified Buyer Badge (coming soon)` / `in arrivo` / `próximamente`. Adapter fail-soft; `BANKS4ALL_PARTNER_TOKEN` empty. |
| **P5** Viewings | `live` | **live** | all | `benefits.items.P5.*` · `how.steps.viewings.*` | EC-3–7 · T21/T22 | Book / confirm / cancel / no-show / ICS. V-1 smoke PASS 2026-08-15. |
| **P6** Checklist | `live` | **live** | all | `benefits.items.P6.*` · `faq.items[0]` | T18 | `SELLER_CHECKLIST_ENABLED` + checklist panel. |
| **P7** Analytics | `live` | **live** | all | `benefits.items.P7.*` | T23 · empty state EC-S-39 | `SELLER_ANALYTICS_ENABLED`. 92/118 listings had zero metrics at close-out. Row **not** reverted. |
| **P8** Control & data | `hidden` | **retracted** | all — none available while `LEGAL_ENTITY` is pre-incorporation | `benefits.items.P8.*` (not rendered) · foot no longer names a controller or version | Gate 0 · EC-S-34 | Consent-ledger **recording** unchanged. |
| `savingsFigures` | `hidden` | **retracted** | all | `savings.*` (section not mounted) | EC-S-34 with P1 | — |
| `mediazioneCopy` | `hidden` | **retracted** | all | `not.*` (section not mounted) | EC-S-34 | `brand.tagline` still renders the opposite claim (untouched). |

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
