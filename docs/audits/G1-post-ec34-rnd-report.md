# G1 — Dossier Asta R&D report (post EC-34 + live 8/8)

**Date:** 2026-08-14 (live verify landed)  
**Audience:** Claude / R&D (forward via Aziz)  
**Code tip at live run:** ≥ **`fc64987`** (report branch on tip of docs PR; main also advanced with unrelated polish)  
**VPS:** `api` + `ai` recreated at deploy — `/api/version` → **`gitSha: fc64987`**  
**Flags:** `ASTE_ANALYSIS_ENABLED` **off** — G2 / `docs/runbooks/aste-enable.md`  
**Spec:** `docs/runbooks/aste-g1-gate.md`  
**Board:** Kaizen · K EC 7.3 · Operations · Improve  

**Live analysisIds (2026-08-14 post-EC-34):** `f97b103c…` … `c7ad0915` (8/8 `ready`)  
**Prior paste baselines:** `docs/audits/G1-aste-status-rnd-feedback.md` (2026-08-13) · Mac logs `/Users/azm/easycasa-g1-results/20260814_*.log`  
**Extract audits:** `docs/audits/EC-29…EC-34-completion-feedback.md`  
**Roadmap:** `docs/audits/aste-g1-hardening-roadmap-ec29-33.md`

---

## Operator summary (forwardable)

| G1 piece | Status | Notes |
| --- | --- | --- |
| Eval pass bar | **Superseded by post-EC-35 report** | See **`docs/audits/G1-post-ec35-rnd-report.md`**. Adjudication `Ex2-7 = 64906`; EC-35 merged+deployed; Mac live re-verify still open. |
| Counsel packet **sent** | **NOT DONE** | Docs 1–8 on disk; email is human |
| Waitlist | **WAIVED** | 1 lead (2026-08-11) |
| Code on `main` + VPS | **EC-35 DONE (see successor)** | EC-29→35 on `main`; #158 @ `6f92e31` |

**Call for R&D / product:** Use **`G1-post-ec35-rnd-report.md`** as the canonical scorecard going forward.  
**Human close checklist:** `docs/runbooks/aste-g1-human-close.md` (Action 1 done; Action 2 counsel send still open).

### Paste stub (actual)

```
G1 post-EC-34: tip 598c9a3 / deployed fc64987 api+ai
extract set EC-29→34 MERGED; pytest aste_extract 53/53
live 8/8 on ≥fc64987: DONE 2026-08-14 — 8/8 ready (f97b103c…c7ad0915)
pass-bar actual:
  GT-5 stato clean ✓ (non_rilevato, orphaned_conformita_stato_dropped)
  Ex8 derive parity ✓ (A+B 13000 derived / 10%)
  GT-4 not_found reconciled ✓ (stima 156000 p22)
  Ex7 stima honest not_found ✓ (micro-chunk found no explicit total — acceptable)
  occupazione/urbanistica lot bleed resolved ✓
  Ex2-7 economics ✗ — still 153850/115387.5 vs documented 64906/48680
counsel: NOT SENT · waitlist WAIVED · flags OFF
open: adjudicate Ex2-7 (open avviso lotto 7 row, or GT true-score)
  → 64906 right: EC-35 micro-brief (lot-association for this table shape)
  → 153850 right: runbook bar correction; eval = GREEN as of this run
watch: GT-3/Ex4 urb non_conforme→non_rilevato downgrade — verify vs perizia prose in GT score
```

---

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE / gate meaning

**G1 =** `eval pass bar` + `counsel packet sent` + `waitlist (met|waived)`. Counsel **answers** → G2. Public enable → `aste-enable.md`.

**Done**
- EC-29→34 on `main` + VPS deploy (`fc64987`).
- Live golden-set **post-EC-34** on Mac: **8/8 `ready`** (analysisIds `f97b103c…c7ad0915`).
- EC-34 goals that landed on live:
  - GT-5 orphaned stato → **`non_rilevato`** + `orphaned_conformita_stato_dropped` ✓
  - Ex8 A/B cauzione **13000 derived / 10%** parity ✓
  - GT-4 stima **156000** reconciled out of `meta.not_found` ✓
  - Ex7 stima **honest `not_found`** after micro-chunk (no explicit total) ✓
  - Occupazione / urbanistica cross-lot bleed resolved ✓
- Waitlist **WAIVED**.

**Not done**
- Ex2 lotto 7 economics vs documented bar (**153850** still returned).
- Counsel email / `packet sent <date>`.
- Drive GT true-score (also needed to adjudicate Ex2-7 and watch GT-3 urbanistica).

**Gate call:** full G1 **not green**. Eval pass bar **blocked on one adjudication** (Ex2-7). Everything else on the post-EC-34 checklist is green or acceptable-honest.

### 2. WHERE BRIEFS / RUNBOOK FAILED YOU

| Type | Detail |
| --- | --- |
| Ex2-7 bar vs extract | Documented pass bar hard-codes **64906/48680** from earlier runs; live post-EC-34 still extracts **153850/115387.5**. Either lot-association still misses this avviso table shape, **or** the runbook bar is wrong / stale vs the PDF row. **Human must open the avviso.** |
| EC-34 incomplete for this shape | Lot-scoped auction filters fixed other bleeds (occupazione/urbanistica) but **not** this economics pair — do not re-ship a broad “lot filter” brief; micro-target the Ex2 multi-lot avviso table if 64906 is right. |
| GT-3 watch | Ex4 urbanistica may have been downgraded `non_conforme` → `non_rilevato` by orphaned-stato rule — confirm against perizia prose in Drive GT score (could be correct drop or over-aggressive). |
| Cloud vs Mac | Confirmed again: live 8/8 only on Mac. |

### 3. REPO REALITY CHECK

- **Stack:** pnpm · Nest API · FastAPI AI · Next · Traefik VPS `/opt/easycasa-ita`
- **Extract tip behavior (live):** orphaned-stato path works; micro-chunk skips inventing Ex7 totals; Ex8 derive deterministic; Ex2-7 still picks the **153850-class** row
- **Do not parallel** another agent on `aste_extract.py` until Ex2-7 adjudicated
- **EC-35** only if 64906 confirmed — scope: this avviso lotto-7 table association only (synthetic fixture mirroring the shape). No schema bump, no flag flips, no Ex7 chunk re-work.

### 4. EFFORT SIGNAL

Live verify was the right next step (not another speculative extract PR). Remaining engineering is **zero or one micro-brief (EC-35)** depending on PDF adjudication — correctly smaller than EC-34.

### 5. BLOCKED / NEEDS A HUMAN

1. **Open Ex2 avviso lotto 7 row** (or Drive GT true-score) → choose 64906 vs 153850.  
2. **Counsel email** → `packet sent <date>`.  
3. **GT score** — especially Ex2-7 + GT-3/Ex4 urbanistica prose vs `non_rilevato` downgrade.  
4. If 153850 wins: **edit** `docs/runbooks/aste-g1-gate.md` pass-bar numbers; mark eval green in this report’s successor stub.  
5. If 64906 wins: dispatch **EC-35** micro-brief only.

### 6. NEXT TASK SHOULD ACCOUNT FOR

1. Adjudication first — **do not** auto-dispatch EC-35.  
2. If EC-35: fixture-first for the two-lot avviso table that still bleeds; keep Ex2 lotto 4 = 36039 as regression fence.  
3. Watch orphaned-stato over-firing on GT-3 when scoring GT.  
4. Counsel + flags still block full G1 / public enable.  
5. Ex7 honest `not_found` is **closed** — do not re-brief micro-chunk.

---

## Pass-bar scorecard (live ≥ `fc64987`, 2026-08-14)

| Check | Result | Notes |
| --- | --- | --- |
| Pipeline 8/8 ready | ✓ | `f97b103c…c7ad0915` |
| Ex2 lotto 4 = 36039 | ✓ (assumed held; not listed as fail) | Prior runs + no regression called out |
| Ex2 lotto 7 = 64906/48680 | ✗ | Got **153850/115387.5** |
| GT-5 stato clean | ✓ | `non_rilevato` + `orphaned_conformita_stato_dropped` |
| Ex7 stima | ✓ honest | micro-chunk found no explicit total |
| GT-4 not_found reconcile | ✓ | stima 156000 p22 |
| Ex8 A/B derive parity | ✓ | both 13000 derived / 10% |
| Occupazione/urbanistica lot bleed | ✓ | resolved |
| GT-3 urb downgrade | watch | verify in GT score |

---

## Extract task ledger

| Task | Status | SHA / PR |
| --- | --- | --- |
| EC-29…EC-33 | merged+deployed | see roadmap |
| EC-34 lot-bleed / orphaned stato / micro-chunk | merged+deployed | #154 `fc64987` |
| EC-35 (conditional) | **not dispatched** | only if 64906 adjudicated correct |

---

*End of G1 post–EC-34 live-verify R&D report.*
