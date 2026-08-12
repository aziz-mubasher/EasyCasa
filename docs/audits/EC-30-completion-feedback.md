# EC-30 — completion feedback (for Claude / R&D)

**Date:** 2026-08-12  
**PR:** https://github.com/aziz-mubasher/EasyCasa/pull/134 (squash `fab9973`)  
**Deploy:** VPS `ai` (+ `api`/`web` same session) force-recreated; `/api/version` tip after batch deploy.  
**Flags:** `ASTE_ANALYSIS_ENABLED` still **off**.  
**Board (proposed):** Kaizen K EC 7.3 / field quality · Operations · Improve  

---

## 1. BRIEF ADHERENCE

**Implemented as specified**
- Field-specific doc-type precedence in Python merge (`_apply_field_precedence`)
- Occupazione enum + post-merge normalization
- Perizia keyword boost in chunk packing (`FIELD_CONTEXT_KEYWORDS`)
- Derived `cauzione.importo` with `derived: true` when only pct + `prezzo_base` known
- Synthetic Italian fixtures in `services/ai/tests/test_aste_extract.py`
- No migration; flags untouched; Ex7 chunking untouched

**Deviations**
- Path is `giuridica.stato_occupazione` (existing v2), not a top-level `occupazione` block
- Optional TS `cauzione.derived` / `stato_occupazione.source` without schema_version bump
- No extra dedicated LLM pass for occupazione/valore_stima

**Skipped**
- Nest mirrors of all field precedence (Nest already has prezzo_base avviso guard only)
- Live golden-set re-run (AZM Mac / Drive PDFs)

---

## 2. WHERE THE BRIEF FAILED YOU

| Type | Detail |
|------|--------|
| Ambiguous | “occupazione” vs repo `giuridica.stato_occupazione` |
| Missing | Whether G1 misses were extract vs merge — both; merge was the deterministic fix |
| Wrong | Implied a global avviso>ordinanza>perizia merge already existed — it did not (first-non-null only) |
| Over-specified | “schema v1.1” — pipeline is v2; additive fields fit without bump |

---

## 3. REPO REALITY CHECK

- **Stack:** FastAPI AI extract map-reduce; Nest persists jsonb; pytest AI / Vitest API
- **Root cause of G1 misses:** merge (no per-field precedence) + packing (perizia starved) + prompt underspec for occupazione
- **Verified in image:** `/app/app/services/aste_extract.py` contains `derive_cauzione_importo`, `_apply_field_precedence`, `FIELD_CONTEXT_KEYWORDS`
- **Next free migration:** still unused by this task (`0060` if a later task needs SQL)

---

## 4. EFFORT SIGNAL

Correctly one PR; smaller than Ex7 chunking. Live GT re-verify remains the large remaining cost (operator).

---

## 5. BLOCKED / NEEDS A HUMAN

- Mac golden-set re-run after this deploy (Homebrew/local DB path still the Mac bottleneck)
- Confirm GT-8 occupazione enum on real phrasing
- Kaizen link PR #134

---

## 6. NEXT TASK SHOULD ACCOUNT FOR

- EC-31 scorer unwrap already merged — use it when pasting live tables
- If GT still misses late perizia occupazione → consider dedicated micro-chunk (+1 LLM call)
- Expand `_normalize_occupazione_stato` aliases from live GT misses only
