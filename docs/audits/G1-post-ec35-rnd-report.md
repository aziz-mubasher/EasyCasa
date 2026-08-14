# G1 — Analisi Aste R&D report (post EC-35 merge + VPS deploy)

**Date:** 2026-08-14 (EC-35 merged + `ai` deployed)  
**Audience:** Claude / R&D (forward via Aziz)  
**Merge:** [#158](https://github.com/aziz-mubasher/EasyCasa/pull/158) @ **`6f92e31`**  
**Repo tip (docs/ledger):** **`3bf417c`** on `main`  
**VPS host tip:** ≥ **`3bf417c`** (contains EC-35); **`ai`** rebuilt + force-recreated  
**API `/api/version`:** still **`gitSha: d422508`** — expected; EC-35 did **not** rebuild `api`  
**Flags:** `ASTE_ANALYSIS_ENABLED` **off** — G2 / `docs/runbooks/aste-enable.md`  
**Spec:** `docs/runbooks/aste-g1-gate.md`  
**Board:** Kaizen · **K EC 7.3** · Operations · Improve · bridge **`task_31ff3a14`**  
**Adjudication:** `Ex2-7 = 64906` (AZM avviso screenshot — Lotto 7 prezzo base €64.906 / offerta minima €48.680)

**Prior:** `docs/audits/G1-post-ec34-rnd-report.md` · live 8/8 post-EC-34 analysisIds `f97b103c…c7ad0915`  
**Extract audit:** `docs/audits/EC-35-completion-feedback.md`  
**Roadmap:** `docs/audits/aste-g1-hardening-roadmap-ec29-33.md`

---

## Operator summary (forwardable)

| G1 piece | Status | Notes |
| --- | --- | --- |
| Eval pass bar (eng) | **Unblocked on Ex2-7 code path** | Adjudication + EC-35 merge/deploy + **VPS in-container smoke green** (lot7 **64906/48680**, lot4 **36039**). **Mac live 8/8 re-verify still required** before declaring eval bar fully GREEN. |
| Counsel packet **sent** | **NOT DONE** | Docs 1–8 on disk; email is human (`aste-g1-human-close.md` Action 2) |
| Waitlist | **WAIVED** | 1 lead (2026-08-11) |
| Code on `main` + VPS `ai` | **DONE** | EC-29→35 on `main`; EC-35 @ `6f92e31`; pytest aste_extract **61/61**; VPS smoke **SMOKE_OK** |

**Call for R&D / product:** Do **not** flip flags. Do **not** claim full G1 green (counsel unsent; Mac live golden-set not re-run on EC-35 tip).  
**Eval pass bar:** eng side ready for Mac confirm. Prior post-EC-34 live greens (GT-5 / Ex8 / GT-4 / Ex7-honest / lot-bleed) assumed held; only Ex2-7 was the open economics fail.

### Paste stub (actual)

```
G1 post-EC-35: merge 6f92e31 (#158) / main tip 3bf417c
extract set EC-29→35 MERGED; pytest aste_extract 61/61
VPS: ai rebuilt+recreated; in-container smoke SMOKE_OK
  lot7 64906/48680 ✓  lot4 36039/27029.25 ✓
  warnings: auction_other_lot_cleared, auction_lot_section_parse
api /version still d422508 (api not rebuilt — OK for ai-only fix)
adjudication: Ex2-7 = 64906 (avviso screenshot)
prior live 8/8 post-EC-34: f97b103c…c7ad0915 (Ex2-7 was the only economics red)
counsel: NOT SENT · waitlist WAIVED · flags OFF
open: Mac live aste:eval Ex2 lotto 4+7 (ideally full 8/8) on tip ≥ 6f92e31
then: product call if Mac green + counsel send
```

---

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE

**G1 =** `eval pass bar` + `counsel packet sent` + `waitlist (met|waived)`. Counsel **answers** → G2. Public enable → `aste-enable.md`.

**Implemented exactly**
- Adjudication `Ex2-7 = 64906` recorded; no runbook bar flip to 153850.
- Deterministic **avviso lot-section** parse for lot-scoped auction economics when `lotto_label` set on multi-lot docs.
- Prefer current vendita / `prezzo base d'asta` over older attempt rows; Italian money parsing.
- Lot association tighten so competing **153850** loses for lotto 7; lotto 4 fence **36039**.
- Synthetic fixtures (values only, no PII); no schema bump; **no flag flips**.
- Merge #158 + VPS **`ai`** deploy.

**Deviations**
- Two agents touched the same PR branch (`task_ec35_pending` placeholder → rebound to **`task_31ff3a14`**). Second agent extended parse (75% pair scoring, more fixtures) rather than opening a duplicate PR — correct dedupe.
- Merged via push-to-`main` after resolving ledger conflict with concurrent PK-2 main tip (GitHub had shown CONFLICTING while draft).

**Skipped (correctly)**
- Prompt / chunk-size / scorer / flag enable / counsel send / Drive GT true-score.

### 2. WHERE THE BRIEF FAILED YOU

| Type | Detail |
| --- | --- |
| Ambiguous | Exact live source of **153850** (other lot vs older vendita). Shipped fixtures for **both**. |
| Missing | No OCR dump of Ex2 avviso page text in the handoff — inferred from screenshot + prior EC-34 notes. |
| Wrong (prior) | EC-34 lot filters alone were assumed enough. They reject wrong rows → **null**, they cannot **recover** a value the LLM never emitted. |
| Over-specified | None blocking. |
| Process | Placeholder bridge id `task_ec35_pending` polluted Claude poll until rebound to `task_31ff3a14`. Always pass the real `task_<hex>` at dispatch. |

### 3. REPO REALITY CHECK

- **Stack:** Python 3.12 FastAPI `services/ai`; pytest; merge path `merge_extractions` → `_apply_field_precedence` → `_deterministic_lot_auction_economics`.
- **Conventions:** Italian money `Euro 64.906,00`; lot sections `\blotto\s+([A-Za-z0-9]+)\b`; warnings `auction_lot_section_parse`, `auction_other_lot_cleared`.
- **Already existed:** EC-34 `_split_by_lot_sections` + lot-aware pick — kept and tightened; EC-34 tests only covered **correctly tagged** dual candidates (missed live **wrong-only LLM** class).
- **Deploy:** VPS `/opt/easycasa-ita`, Traefik compose pair, `--no-cache` rebuild `ai` + `--force-recreate --no-deps ai`. Cloud can SSH with injected `VPS_SSH_*`. `/api/version` tracks **api** image tip, not `ai`.
- **Constraints:** Golden PDFs Mac/Drive-only — cloud cannot close live eval bar; counsel email human-only.

### 4. EFFORT SIGNAL

Correctly scoped as **one micro-task**. Slightly larger than “filter tweak only” because deterministic parse was mandatory for recovery. Concurrent PK-2 merges on `main` added a one-file ledger conflict — expect that on this repo.

### 5. BLOCKED / NEEDS A HUMAN

1. **Mac live re-verify** (minimum):  
   `pnpm aste:eval -- --example 2 --lotto 4` → 36039 / 27029.25  
   `pnpm aste:eval -- --example 2 --lotto 7` → 64906 / 48680  
   Ideally full 8/8 on tip ≥ `6f92e31`.
2. **Counsel packet send** — reply `packet sent 2026-08-DD (response requested by 2026-08-DD)`.
3. **Kaizen K EC 7.3** — mark ~90% / link #158 (Operations · Improve). Startup N/A unless product asks Phase 3 note.
4. Optional: rebuild `api` if you want `/api/version` gitSha to match host tip (cosmetic for this change).

### 6. NEXT TASK SHOULD ACCOUNT FOR

- Fixtures must simulate **wrong-only LLM picks** on multi-lot page text, not only correctly tagged dual candidates.
- Prefer **deterministic parse** when the failure mode is “LLM never emitted the right number.”
- Always set real **`task_<hex>`** on the bridge ledger at start (no `task_*_pending`).
- After Mac Ex2-7 green: product call (`G1 green` vs stay hardening-first) + counsel send remain the only G1 closers. Flags stay off until `aste-enable.md`.
- Watch still open from post-EC-34: GT-3/Ex4 urbanistica `non_rilevato` vs perizia prose at Drive GT score.

---

## Evidence

| Check | Result |
| --- | --- |
| pytest `tests/test_aste_extract.py` | **61 passed** |
| PR #158 | **MERGED** @ `6f92e31` |
| VPS `ai` | rebuilt + recreated; Uvicorn up |
| In-container smoke | lot7 **64906/48680**, lot4 **36039/27029.25**, `SMOKE_OK` |
| Flags | **off** |
