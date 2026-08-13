# G1 Hardening Roadmap (EC-29→33) — R&D report for Claude

**Date:** 2026-08-13  
**Source PR:** https://github.com/aziz-mubasher/EasyCasa/pull/148 (squash `a60a40c`)  
**Canonical ledger:** `docs/audits/aste-g1-hardening-roadmap-ec29-33.md`  
**Deploy:** VPS `/opt/easycasa-ita` tip `a60a40c` (docs-only `git pull`; no container recreate)  
**Flags:** `ASTE_ANALYSIS_ENABLED` still **off**  
**Board:** Kaizen · K EC 7.3 · Operations  

---

## Operator summary (forwardable)

| Item | Status |
| --- | --- |
| Extract-quality set EC-29→33 | **MERGED + on VPS** (`fe1e0c7` code tip; docs ledger `a60a40c`) |
| G1 gate | **NOT GREEN** — conscious near-miss → hardening-first |
| Eval pass bar | Awaiting **live 8/8 re-run** on tip ≥ `fe1e0c7` |
| Counsel packet | **NOT DONE** — human send docs 1–8 + LGL-1 |
| Waitlist | **WAIVED** — 1 lead (2026-08-11) |
| Stale draft #132 (EC-29) | **Closed** as superseded by `57b0f1f` |

**Do not** brief new `aste_extract.py` field work until the live paste. Do **not** flip analysis flags. Do **not** treat EC-27 / EC-28 / G2 enable as unlocked by this docs land.

---

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE

**Implemented exactly**
- Landed durable roadmap ledger: gate definition, EC-29→33 task table, eval field state, standing rules, Mac 8/8 recipe, human remaining list.
- Superseded next-brief guidance in `docs/audits/G1-aste-status-rnd-feedback.md` (paste tables retained as pre–EC-32/33 baseline).
- Closed orphan draft [#132](https://github.com/aziz-mubasher/EasyCasa/pull/132).
- Merged [#148](https://github.com/aziz-mubasher/EasyCasa/pull/148) → `main` `a60a40c`; VPS pulled tip.

**Deviations**
- None material. Docs-only; no service rebuild (correct for audit markdown).

**Skipped**
- Kaizen board link of #134/#136/#144/#146 (human / no board write in this run).
- Live golden-set re-run (Mac Drive PDFs).
- Counsel email send.

### 2. WHERE THE BRIEF FAILED YOU

| Type | Detail |
| --- | --- |
| Ambiguous | Chat paste vs commit — committed so Claude has one in-repo source of truth |
| Missing | Nothing blocking for a status sync |
| Wrong | Prior G1 status audit still told Claude to brief urbanistica/cauzione/stima — that was the drift this land fixes |
| Over-specified | N/A |

### 3. REPO REALITY CHECK

- **Stack:** pnpm monorepo · Nest API · FastAPI AI · Next web · Traefik VPS `/opt/easycasa-ita`.
- **Extract single-writer:** `services/ai/app/services/aste_extract.py` — never parallel briefs.
- **Shipped SHAs:** EC-29 `57b0f1f` · EC-30 `fab9973` (#134) · EC-31 `0ebf1be` (#136) · EC-32 `0b861ee` (#144) · EC-33 `fe1e0c7` (#146).
- **Occupazione path:** `giuridica.stato_occupazione` (not top-level).
- **Env:** `VALORE_STIMA_MIN_PREZZO_BASE_RATIO` (ai, default `0.01`) from EC-33.
- **Eval invoke:** `pnpm --filter @easycasa/api run aste:eval` → build + `node -r reflect-metadata` (do not re-litigate).
- **EC-28:** already on main (#119 `247c76f`) — do not re-send as G1 unlock.
- **GT file:** Drive-only `EC_Aste_GoldenSet_GroundTruth_v1.md` — not in git.
- **Cloud agent:** cannot run golden PDFs; public `easycasa.online` DNS may fail from agent — use VPS tip + Mac operator recipe.

### 4. EFFORT SIGNAL

Smaller than implied by a full “roadmap” title — docs + hygiene only. Correct as one task; do not split.

### 5. BLOCKED / NEEDS A HUMAN

1. **Live 8/8** on tip ≥ `fe1e0c7` (same-shell AI, ~90s cooldown, MinIO on `/Volumes/Muba/easycasa-minio-data`, tesseract+ita) → paste TSV tables.  
   - Expect: urbanistica/cauzione verify EC-32; Ex5 stima → not_found + `valore_stima_suspect` (not bogus 84); Ex7 stima may still need **micro-chunk-only** follow-up.
2. **Counsel email** → reply `packet sent <date>`.
3. **Drive GT true-score** vs ground-truth doc.
4. **Product call** — green vs stay hardening-first.
5. **Kaizen K EC 7.3** — link PRs #134 / #136 / #144 / #146.
6. **EC-24:** OMI sconto-reale must tolerate `valore_stima` = `not_found` before any EC-24-dependent brief.

### 6. NEXT TASK SHOULD ACCOUNT FOR

1. **No new extract brief** until live paste lands. Only then: optional Ex7 micro-chunk-only if stima still misses (not a new EC number unless needed).
2. Do not re-brief Ex7 400 / chunk size / runbook invoke unless regression.
3. Do not brief flag enable / EC-27 payments / “G1 green” until the gate ledger says so.
4. Standing rules in the roadmap doc apply to every future Aste brief (single-writer, additive schema, zero invented values, field precedence).
5. After G1 green: G2 still needs VPS observability, counsel EXTERNAL sign-off, and `docs/runbooks/aste-enable.md` smoke.

---

## G1 paste stub (post–roadmap land)

```
packet sent: NOT YET
waitlist: WAIVED — 1 lead (2026-08-11)
eval: near-miss / hardening-first — awaiting live 8/8 on tip ≥ fe1e0c7
shipped: EC-29→33 on main; VPS tip a60a40c (ledger); flags still off
ledger: docs/audits/aste-g1-hardening-roadmap-ec29-33.md
```

---

*End of roadmap R&D report for Claude.*
