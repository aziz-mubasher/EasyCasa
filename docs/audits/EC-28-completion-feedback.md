# EC-28 — completion feedback (for Claude / R&D)

**Date:** 2026-08-11  
**PR:** https://github.com/aziz-mubasher/EasyCasa/pull/119 (squash `247c76f`)  
**Board (proposed):** K EC 1.51 · Sales · Improve  
**Deploy:** VPS `web` (+ `api` for shared analytics constants) force-recreated after merge; see land SHA in `/api/version`.  
**Flags:** `ASTE_ANALYSIS_ENABLED` still **off** — block is dark until G2.

---

## 1. BRIEF ADHERENCE

**Implemented as specified**
- Deterministic trigger matrix (priority 1 > 2 > 3): `financing_need`, `readiness_financing`, `mutuabilita`.
- One Banks4All block per full report; placement in buyer-readiness panel (1/2) or after criticità (3).
- Extended `AffordThisHomeReferralBlock` with `variant="aste"`, lead-in key, `reportContext="full"` teaser gate for EC-27.
- Reused approved `banks4AllReferral.*` claims (OAM/free); new keys under `banks4AllReferral.aste.*` IT/EN/ES.
- Attribution: `aste_financing_block_shown` / `aste_financing_cta_clicked` with `trigger`, `locale`, optional `provincia` — no analysis/user/RGE/address.
- Outbound UTM: `utm_source=easycasa&utm_medium=aste_report&utm_campaign=aste` on aste only; listing URLs stay query-free.
- No migration; no pipeline/chat/listing default behaviour change.

**Deviations**
- Brief said “apps/api (events only)” — event **names** live in `@easycasa/shared` (same pattern as other PRODUCT_EVENTS); web fires them client-side. No Nest emit path for CTA clicks (correct for Phase A outbound links).
- No RTL component snapshots — web package has no `@testing-library/react`; covered via trigger matrix + URL absence assertions + i18n key tests.

**Skipped**
- Visual verification / real golden-set report walkthrough (human checklist; flag still off).
- Live probe of Banks4All `/it/` and `/es/` portal paths.

---

## 2. WHERE THE BRIEF FAILED YOU

| Type | Detail |
|------|--------|
| Ambiguous | Trigger 2 vs 1: `financing_timeline` only appears when `financing_needed===true` today → often co-fire; priority 1 wins. Trigger 2 alone via `non_eu_eligibility_counsel`. |
| Ambiguous | “Occupied” — no closed enum; used keyword heuristic (`occupat\|locat\|affitt\|…`). |
| Missing | Whether PRODUCT_EVENTS wire names should use dots (`aste.*`) vs underscores — followed brief’s underscore form. |
| Over-specified vs repo | Existing referral helper forbade query strings in tests — extended with **optional** UTM arg so listing Phase A stays plain. |

---

## 3. REPO REALITY CHECK

- **Stack:** Next.js web, Nest API, `@easycasa/shared` analytics sink, Tailwind on financing block, aste report `ar-*` CSS.
- **Referral config:** `getBanks4AllReferralUrl` builds `portal.banks4all.eu/{it\|en\|es}/property-plan` and `www.banks4all.eu/{it\|en\|es}/property-investment-plan`. Unknown EasyCasa locales map to **`it`**, not `/en/` (helper does not silent-fallback to English).
- **Live Banks4All locale paths:** not verified from the agent — if `/es/` 404s in production, fix in `banks4all-referral.ts` only.
- **OWNER-TO-CONFIRM:** not present in repo; OAM/12h string is `heroTrustLine` and was reused.
- **Constraints:** PRODUCT_EVENTS props remain `string\|number\|boolean\|null\|undefined` — no nested objects; provincia as string only.

---

## 4. EFFORT SIGNAL

Smaller than a greenfield financing feature — Phase A block + message catalog already existed. Correctly one task.

---

## 5. BLOCKED / NEEDS A HUMAN

- Kaizen **K EC 1.51** → link PR #119, set Improve progress (AZM board).
- **ES copy owner review** before G2.
- Confirm Banks4All still serves `/it/` and `/es/` portal paths.
- Human visual checklist on a ready v2 report once flag/eval path allows (financing_needed + occupied GT-8).
- Do **not** enable `ASTE_ANALYSIS_ENABLED` for this alone — G1/G2 still govern launch.

---

## 6. NEXT TASK SHOULD ACCOUNT FOR (esp. EC-27)

1. Teaser/full split: block requires `reportContext="full"` — teaser must not pass `full`.
2. Placement is **split** (readiness vs after criticità); teaser layout must not assume a single slot.
3. Never put analysis id / RGE / address into UTMs when monetizing — tests already assert absence.
4. Next free migration index remains **`0060`** if EC-27 needs one (this task used none).
5. G1 still gates payments (EC-27) and public financing-lane visibility.
