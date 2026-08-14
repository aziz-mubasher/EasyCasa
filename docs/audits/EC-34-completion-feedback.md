# EC-34 — completion feedback (for Claude / R&D)

**Date:** 2026-08-14  
**PR:** https://github.com/aziz-mubasher/EasyCasa/pull/154 → merged `fc64987`  
**Bridge task:** `task_4f931596`  
**Cloud agent:** `bc-6c2d68f9-0329-4ed8-9f37-9b0cf401c143`  
**Deploy:** VPS `banks4all-vps` `/opt/easycasa-ita` — `api` + `ai` `--no-cache` + `--force-recreate` (tip `fc64987`).  
**Flags:** `ASTE_ANALYSIS_ENABLED` still **off**.  
**Board:** Kaizen · K EC 7.3 · Operations · Improve  

Fixes regressions from the **2026-08-14** live 8/8 golden-set run on tip `c67c8ad` (post EC-29→33). Builds on EC-32/33 lot-aware machinery.

---

## 1. BRIEF ADHERENCE

**Implemented as specified**
- Lot-scoped economics (`prezzo_base`, `offerta_minima`, `rilancio_minimo`, `cauzione`, `stato_occupazione`) via `_sourced_value_for_other_lot_only` + lot-aware precedence (generalized from EC-33 `valore_stima` filter)
- Orphaned conformità stato → `non_rilevato` when target-lot difformità empty (`orphaned_conformita_stato_dropped` warning)
- Ex7 `valore_stima` micro-chunk (+1 LLM) gated by `ASTE_STIMA_MICROCHUNK_ENABLED` (default on); skip when no perizia
- `meta.not_found` reconciliation after late fills; per-lot cauzione derive determinism
- Synthetic pytest fixtures (8 new); env in `.env.example` + `docs/env.md`
- Flags untouched

**Deviations**
- None material (PR body). Dual `prezzo_base_candidates` also filters other-lot avviso rows.

**Skipped / deferred to operator**
- Live 8/8 golden-set re-verify post-merge (Mac / Drive) — **still required** to confirm Ex2-7 = 64906 and GT-5 stato clean

---

## 2. WHERE THE BRIEF FAILED YOU

| Type | Detail |
|------|--------|
| Ambiguous | Shared multi-lot page without per-row `lotto` — resolved via `_split_by_lot_sections` + numeric proximity |
| Missing | Exact source row for wrong Ex2-7 value 153850 — inferred as lot-blind avviso candidate pick |
| Wrong | Nothing about stack |
| Over-specified | None blocking |

**Merge ops note (local Mac):** PR was **draft** + **dirty** vs main (`status-ledger.json` conflict with PP-6). Operator merge: main into PR branch → reconcile ledger → land on `main` as `fc64987`. Accidental local noise (`docker-compose.local-ports.yml`, `node_modules.partial.*`) briefly entered the merge commit and was removed in `b7900c7` before push.

---

## 3. REPO REALITY CHECK

- **Stack:** FastAPI `aste_extract.py` map-reduce; Nest `aste:eval`; pytest AI  
- **Lotto-7 regression mechanism:** EC-32/33 added lot filter for **`valore_stima` only**. Auction fields stayed lot-blind → `_pick_by_precedence` took first/richest avviso row → Ex2 lotto 7 bled to **153850 / 115387.5** (pass bar wants **64906 / 48680**). Lotto 4 (36039) was fine.  
- **GT-5:** difformità other-lot drop worked (`difformita=0`) but `stato=non_conforme` survived orphaned — now downgraded.  
- **GT-4 cauzione:** if pct is of **prezzo offerto**, no-derive fence is correct; if of `prezzo_base`, derive restores after lot-scoped base. Live re-run decides.  
- **Micro-chunk cost:** +1 `gpt-4o-mini` JSON call (~12k char cap on stima perizia pages); skipped for avviso-only dossiers (Ex2).  
- **Env:** `ASTE_STIMA_MICROCHUNK_ENABLED` (ai, default `true`)

---

## 4. EFFORT SIGNAL

Correctly one PR (~400 LOC logic + ~300 LOC tests). Brief sizing accurate. Merge/deploy ops added Mac ledger conflict + draft PR friction.

---

## 5. BLOCKED / NEEDS A HUMAN

1. **Live 8/8 re-run** on tip ≥ `fc64987` (same-shell AI, ~90s cooldown) — expect Ex2-7 economics restored; GT-5 not bare `non_conforme`; Ex7 stima filled or honest `not_found`.  
2. Drive GT true-score + counsel `packet sent <date>`.  
3. Close/merge GitHub PR UI state if draft still shows open after push (code is on `main` @ `fc64987`).  
4. Kaizen K EC 7.3 board mark complete (outside Cursor if bridge `completeOnAttach` didn’t fire).

---

## 6. G1 / NEXT

**Expect pass-bar green** on live re-run for Ex2-7 economics + GT-5 stato + GT-4 not_found reconciliation + Ex8 derive parity. Ex7 stima may still be honest `not_found` if perizia lacks an explicit total. Do **not** enable `ASTE_ANALYSIS_ENABLED`. Counsel send remains the human G1 gate.

### Paste stub (post live re-verify — update after Mac suite)

```
EC-34 merged+deployed: main fc64987 api+ai recreated
live 8/8: PENDING operator re-run
expected: Ex2-7 prezzo_base 64906; GT-5 stato non_rilevato|conforme; flags still off
```

**Canonical gate status for Claude:** `docs/audits/G1-post-ec34-rnd-report.md`

---

*End of EC-34 completion feedback for R&D.*
