# EC-33 — completion feedback (for Claude / R&D)

**Date:** 2026-08-13  
**PR:** https://github.com/aziz-mubasher/EasyCasa/pull/146 (squash `fe1e0c7`)  
**Deploy:** VPS `ai` + `api` force-recreated; `/api/version` → `gitSha: fe1e0c7`.  
**Flags:** `ASTE_ANALYSIS_ENABLED` still **off**.  
**Board:** Kaizen · K EC 7.3 · Operations · Improve  

Last planned G1 extract-quality brief (EC-30 → EC-32 → EC-33 trilogy). Builds on EC-32 tip `0b861ee`.

---

## 1. BRIEF ADHERENCE

**Implemented as specified**
- Prompt guard: total stima, never €/mq / never multiply surface
- Plausibility guard: reject when `valore_stima` < `VALORE_STIMA_MIN_PREZZO_BASE_RATIO` × `prezzo_base` (default **0.01**); emit `meta.warnings` `valore_stima_suspect` and clear bogus value → `not_found` path
- Per-lot stima filter at `_apply_field_precedence` via `_collect_valore_stima_candidates` + `lotto_label`
- Packing keywords for stima / CTU valuation sections
- Synthetic pytest fixtures; env documented in `.env.example` + `docs/env.md`
- Flags untouched

**Deviations**
- **Skipped dedicated micro-chunk (+1 LLM call)** — keyword expansion + perizia boost only (0 extra tokens). Brief allowed “your call”; treated micro-chunk as fallback after live verify.

**Skipped**
- Live 8/8 golden-set re-run (Mac operator)

---

## 2. WHERE THE BRIEF FAILED YOU

| Type | Detail |
|------|--------|
| Ambiguous | Micro-chunk mandatory vs optional — chose keywords-only |
| Missing | No Ex5/Ex2/Ex7 fixture PDFs — inferred Ex5 €/mq from EC-32 feedback |
| Wrong | Nothing about stack |
| Over-specified | None blocking |

---

## 3. REPO REALITY CHECK

- **Stack:** FastAPI `aste_extract.py` + pydantic `Settings`; pytest AI
- **Per-case (inferred):**
  - Ex5 `84` @ p16 → €/mq row → prompt + 1% plausibility (84 ≪ 1% × ~84k base)
  - Ex2 lots 4/7 → multi-lot stima bleed → lot filter on candidates
  - Ex7 lotto H → packing / late stima → keywords; **live verify required**
- **Env knobs:** `VALORE_STIMA_MIN_PREZZO_BASE_RATIO` (ai, default `0.01`)
- **OMI note:** when guard fires, stima may be `not_found` — EC-24 OMI sconto-reale must tolerate missing stima

---

## 4. EFFORT SIGNAL

Correctly one PR; similar to EC-30/32. Smaller than Ex7 chunking.

---

## 5. BLOCKED / NEEDS A HUMAN

- Mac 8/8 re-run on tip ≥ `fe1e0c7` (same-shell AI, ~90s cooldown)
- Drive GT true-score
- Counsel `packet sent <date>`
- If Ex7 still misses → brief **micro-chunk-only** follow-up (not EC-34 yet unless needed)

---

## 6. G1 / NEXT

Extract-quality trilogy complete for planned scope. Expect live re-run to green valore_stima (Ex5 → not_found + `valore_stima_suspect` rather than bogus 84). Do **not** reopen urbanistica/cauzione unless regression. G1 still needs counsel send + product call after paste tables.
