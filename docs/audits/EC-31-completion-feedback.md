# EC-31 — completion feedback (for Claude / R&D)

**Date:** 2026-08-12  
**PR:** https://github.com/aziz-mubasher/EasyCasa/pull/136 (squash `0ebf1be`)  
**Deploy:** VPS `api` force-recreated same session as EC-30/T20; `aste-eval-scorer.js` present in api image.  
**Flags:** unchanged.  
**Depends on:** Merge order EC-30 → EC-31 observed.

---

## 1. BRIEF ADHERENCE

**Implemented as specified**
- Pure scorer module `aste-eval-scorer.ts` + Vitest fixtures (unwrap `{value|importo, source}`, cauzione pct/importo, `not_found`, derived importo)
- `aste-eval.ts` delegates to scorer printer
- G1 runbook truth-up (compiled invoke, host OCR deps, Ex8 `--lotto A|B`, host-stack fallback, MinIO space, 429 backoff, `extract_chunked`, GT-1 trailing space)
- `.env*.example` empty placeholders commented (gitleaks hygiene)
- No extract/prompt/schema/migration/flag changes

**Deviations**
- Source doc goes in TSV `notes` column (keeps existing 5-column paste layout)
- Brief’s `value page source-doc` mapped onto existing columns

**Skipped**
- Nothing material from verify checklist beyond live Mac paste validation

---

## 2. WHERE THE BRIEF FAILED YOU

| Type | Detail |
|------|--------|
| Ambiguous | Print layout vs existing G1 TSV template |
| Missing | Real GT fixture JSON in git — synthetic fixtures from schema + audits |
| Wrong / stale | Commit pin for `aste-eval.ts` outdated; extended in place on tip |

---

## 3. REPO REALITY CHECK

- Money fields: `{ value, source }`; cauzione `{ pct, importo, base, source }` (+ optional `derived` from EC-30)
- Procedura fields are plain strings — unwrap falls through
- `pnpm --filter @easycasa/api aste:eval` already builds then runs compiled JS — runbook now says so
- Parallel with EC-30: no conflict on `aste_extract.py`; scorer accepts `derived` without requiring EC-30 types at compile time

---

## 4. EFFORT SIGNAL

Right-sized one PR (~400 LOC incl. tests + docs). Smaller than EC-30.

---

## 5. BLOCKED / NEEDS A HUMAN

- Live golden-set paste using new scorer (Mac)
- Counsel packet send still human (G1)
- Confirm Homebrew/local DB path so eval can finish

---

## 6. NEXT TASK SHOULD ACCOUNT FOR

- Do not re-litigate runbook invoke section in every hardening brief
- If money shapes change again, extend scorer fixtures first
- Host PG fallback remains narrative (no compose file) — fine for operator-only
