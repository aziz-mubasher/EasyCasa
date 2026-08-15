# EC-24-VERIFY — completion feedback (for Claude / R&D)

**Date:** 2026-08-15  
**Agent:** https://cursor.com/agents/bc-69db7d02-68f1-4663-8ae9-9d735479dd2c  
**PR:** https://github.com/aziz-mubasher/EasyCasa/pull/170  
**Verdict:** **Tolerant as-built — tests-only.** Pre-EC-27 gate **(b) ✓**.  
**Flags:** `ASTE_ANALYSIS_ENABLED` still **off**.  

---

## 1. BRIEF ADHERENCE

**Implemented**
- Fixtures: Ex2 no-perizia (lotti 4/7), suspect-cleared, derived cauzione, Ex7 honest (`stima-not-found.fixtures.ts`)
- Unit tests: `aste-omi-stima-not-found.spec.ts` — `buildOmiCheck` null-safe; OMI band present; `valore_stima_vs_omi_pct` null; sconto from `prezzo_base` only when superficie known
- Integration: report API path with not_found stima
- Web: `aste-report-display.ts` helpers (em dash / null-safe) for EC-27 teaser reuse
- Checklist (b) ticked in `docs/runbooks/aste-pre-ec27-checklist.md`

**Deviations**
- Small display-helper extract (no product behavior change)

**Skipped**
- Drive GT (c) — out of scope
- No production fix — path already null-safe via `?.value ?? null`

---

## 2. WHERE THE BRIEF FAILED YOU

| Type | Detail |
| --- | --- |
| Ambiguous | “non rilevato” vs em dash — report uses i18n `notFound` for economics rows; OMI sconto uses `—` |
| Missing | Nothing blocking |
| Wrong | Path was already safe; brief correctly framed as verify |

---

## 3. REPO REALITY CHECK

- **Sconto-reale:** `apps/api/src/aste/aste-omi-check.ts` `buildOmiCheck` — math from **prezzo_base vs OMI mid**, not stima
- **Wire-up:** `AsteOmiCheckService.compute()` unwraps `valore_stima?.value ?? null`
- **UI:** `AsteReportPage` + `aste-report-display.ts`
- **EC-27 teaser:** not built yet — must import display helpers; never invent stima for headline

---

## 4. EFFORT SIGNAL

Smaller than a “fix” brief — correctly one verify PR.

---

## 5. BLOCKED / NEEDS A HUMAN

- Optional (c) Drive GT true-score
- EC-27 payments brief may now be dispatched
- G2 still waits counsel answers (~2026-08-29)

---

## 6. NEXT (EC-27) MUST ACCOUNT FOR

- Teaser OMI uses `omiCheck.available` + `omi_range`, **not** `valore_stima`
- Sconto copy only when `sconto_reale_pct != null`
- Reuse `apps/web/src/lib/aste-report-display.ts`

---

## Local re-verify (merge agent)

```
pnpm --filter @easycasa/api exec vitest run src/aste/aste-omi-stima-not-found.spec.ts src/aste/aste-omi-check.spec.ts
→ 14 passed
pnpm --filter @easycasa/web exec vitest run src/lib/aste-report-display.spec.ts
→ 7 passed
```
