# EC-32 — completion feedback (for Claude / R&D)

**Date:** 2026-08-13  
**PR:** https://github.com/aziz-mubasher/EasyCasa/pull/144 (squash `0b861ee`)  
**Deploy:** VPS `ai` + `api` force-recreated after merge; `/api/version` → `gitSha: 0b861ee` (or tip).  
**Flags:** `ASTE_ANALYSIS_ENABLED` still **off**.  
**Board:** Kaizen · K EC 7.3 · Operations · Improve  

Builds on EC-30 (`fab9973`) + EC-31 (`0ebf1be`). **valore_stima** deferred to **EC-33** (same file — no parallel agents).

---

## 1. BRIEF ADHERENCE

**Implemented as specified**
- Urbanistica + catastale conformità structured enum (`conforme` | `non_conforme` | `non_rilevato`) + `difformita[]`
- Perizia-first precedence + conformity keyword packing
- Cauzione patterns (a)/(b)/(c) + offer-based no-derive; `derived: true` preserved
- GT-5 negative-space fixture (lotto H stays clean)
- Scorer: lotto-H note quieted on non-H cases
- Runbook: same-shell AI + ~90s cooldown paragraph
- No schema_version bump; flags untouched

**Deviations**
- Conformità keeps `{stato, dettaglio}` (additive, EC-30 precedent)
- `_apply_field_precedence` now takes `lotto_label` so GT-5 filter applies at precedence pick (raw chunk re-read was bypassing `_merge_urbanistica` drop)

**Skipped**
- Live 8/8 golden-set re-run (Mac / Drive)
- valore_stima (EC-33)

---

## 2. WHERE THE BRIEF FAILED YOU

| Type | Detail |
|------|--------|
| Ambiguous | Urbanistica miss = prompt + packing + precedence triad (same as EC-30 occupazione) |
| Missing | Precedence reading raw `parts` re-introduced other-lot `non_conforme` — found via GT-5 regression test |
| Wrong | Nothing about stack |
| Over-specified | None blocking |

---

## 3. REPO REALITY CHECK

- **Stack:** FastAPI `aste_extract.py` map-reduce; Nest compiled `aste:eval`; pytest / Vitest
- **Urbanistica root cause:** prompt underspec + packing + precedence without lot filter
- **Cauzione:** Ex2-4 = derive trigger (string pct / missing base); Ex2-7/Ex7/Ex8 = extract/parse (prompt + cross-chunk merge + coerce)
- **Schema bump:** not needed (`sanabile` already typed)
- **valore_stima for EC-33:** Ex5=`84` @ p16 — suspect €/mq or table-row mis-parse; Ex2×2 + Ex7 misses may be packing despite perizia-first

---

## 4. EFFORT SIGNAL

Correctly one PR; similar size to EC-30. Live GT re-verify is the remaining cost.

---

## 5. BLOCKED / NEEDS A HUMAN

- Mac golden-set 8/8 re-run on tip ≥ `0b861ee`
- Drive GT true-score
- Counsel `packet sent <date>`

---

## 6. NEXT TASK (EC-33) SHOULD ACCOUNT FOR

- Same file — sequence after this; no parallel agents on `aste_extract.py`
- Prompt guard: total property value, **not** €/mq
- May need valore_stima-specific keyword boost or micro-chunk if packing still starves stima sections
- Do not re-open urbanistica/cauzione unless regression
