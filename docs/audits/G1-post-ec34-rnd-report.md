# G1 — Analisi Aste R&D report (post EC-34)

**Date:** 2026-08-14  
**Audience:** Claude / R&D (forward via Aziz)  
**Code tip:** `main` @ **`598c9a3`** (≥ merge `fc64987` EC-34 + deploy feedback)  
**VPS:** `/opt/easycasa-ita` — `api` + `ai` force-recreated; `/api/version` reported **`gitSha: fc64987`** at deploy  
**Flags:** `ASTE_ANALYSIS_ENABLED` **off** — G2 / `docs/runbooks/aste-enable.md`  
**Spec:** `docs/runbooks/aste-g1-gate.md`  
**Board:** Kaizen · K EC 7.3 · Operations · Improve  

**Canonical prior paste tables:** `docs/audits/G1-aste-status-rnd-feedback.md` (2026-08-13 baseline) + live 2026-08-14 suite logs on Mac `/Users/azm/easycasa-g1-results/20260814_GT*.log`  
**Extract completion audits:** EC-29…EC-34 under `docs/audits/EC-*-completion-feedback.md`  
**Roadmap ledger:** `docs/audits/aste-g1-hardening-roadmap-ec29-33.md` (now includes EC-34)

---

## Operator summary (forwardable)

| G1 piece | Status | Notes |
| --- | --- | --- |
| Eval pass bar | **Pending live verify on tip ≥ `fc64987`** | Engineering extract set **EC-29→34** merged + deployed. Pre-EC-34 2026-08-14 run was 8/8 ready but **failed pass bar** (Ex2-7 bleed 153850; GT-5 orphaned `non_conforme`). EC-34 targets those. Cloud agent **cannot** re-run Drive PDFs. |
| Counsel packet **sent** | **NOT DONE** | Docs 1–8 on disk; email is human |
| Waitlist | **WAIVED** | 1 lead (2026-08-11) |
| Code on `main` + VPS | **DONE** | EC-34 [#154](https://github.com/aziz-mubasher/EasyCasa/pull/154) @ `fc64987`; fixtures **53/53** pytest green on cloud |

**Call for R&D:** Do **not** declare G1 green from this report. Do **not** flip flags. Next decisive step is **Mac live 8/8** on tip ≥ `fc64987`. If that run meets the pass-bar table below (Ex7 honest `not_found` allowed), **eval pass bar = green**; counsel send still blocks full G1.

### Paste stub

```
G1 post-EC-34: tip 598c9a3 / deployed fc64987 api+ai
extract set EC-29→34 MERGED; pytest aste_extract 53/53
live 8/8 on ≥fc64987: PENDING (Mac only — Drive PDFs)
pass-bar expect: Ex2-7 64906/48680; GT-5 stato clean; Ex7 stima or honest not_found; GT-4 reconciled; Ex8 derive parity
counsel: NOT SENT · waitlist WAIVED · flags OFF
```

---

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE / gate meaning

**G1 =** `eval pass bar` + `counsel packet sent` + `waitlist (met|waived)`. Counsel **answers** → G2. Public enable → `aste-enable.md`.

**Done**
- Full extract-quality sequence **EC-29 → EC-34** on `main`, VPS `ai`/`api` live at `fc64987`.
- Live golden-set runs on Mac: 2026-08-13 (baseline) and **2026-08-14** (post EC-32/33 tip `c67c8ad`) — both 8/8 `ready`.
- Waitlist **WAIVED**.
- EC-34 shipped: lot-scoped auction economics, orphaned conformità stato → `non_rilevato`, Ex7 stima micro-chunk (`ASTE_STIMA_MICROCHUNK_ENABLED`), `meta.not_found` reconciliation, per-lot cauzione derive determinism.
- Cloud re-check: tip ancestor of `fc64987`; **53/53** `services/ai/tests/test_aste_extract.py`.

**Not done**
- Live 8/8 **re-verify on tip ≥ `fc64987`** (Mac / Drive only).
- Counsel email / `packet sent <date>`.
- Drive GT true-score vs `EC_Aste_GoldenSet_GroundTruth_v1.md`.

**Gate call:** still **not green**. Engineering stance: pass bar **should** go green after Mac verify if EC-34 holds; Ex7 `not_found` = acceptable-honest.

### 2. WHERE BRIEFS / RUNBOOK FAILED YOU

| Type | Detail |
| --- | --- |
| Wrong env (standing) | Compose on `/Volumes/Muba` breaks AppleDouble → host PG17 + Redis/MinIO/Meili/AI |
| AI lifecycle | Suite must start AI **in the same shell** or mid-suite restart (`AI_DOWN` otherwise) |
| Cloud vs Mac | Cloud agents **cannot** run golden-set (runbook line 6). Dispatching “live 8/8” to cloud wastes a turn |
| EC-32/33 incomplete lot scope | Lot filter applied to **`valore_stima` only** → Ex2 lotto 7 economics bleed (64906 → **153850**) on 2026-08-14 |
| GT-5 incomplete | Difformità drop worked; orphaned `stato=non_conforme` with `difformita=0` still failed pass bar → EC-34 |
| Draft PR friction | EC-34 PR #154 was draft + dirty vs main ledger (PP-6) — needed local merge reconcile |

### 3. REPO REALITY CHECK

- **Stack:** pnpm monorepo · Nest API · FastAPI AI (Py 3.12) · Next web · Traefik VPS `/opt/easycasa-ita`
- **Extract:** `services/ai/app/services/aste_extract.py` — chunking + 429 backoff + field precedence + lot filters (now auction fields too) + orphaned-stato reconcile + optional stima micro-chunk
- **Eval:** `pnpm --filter @easycasa/api run aste:eval` → build + `node -r reflect-metadata`
- **Env knobs:** `VALORE_STIMA_MIN_PREZZO_BASE_RATIO` (default 0.01); `ASTE_STIMA_MICROCHUNK_ENABLED` (default true)
- **Already exists:** do not re-brief Ex7 400, occupazione enum, urbanistica schema, scorer unwrap, runbook invoke — unless live re-run regresses
- **Single-writer:** `aste_extract.py` — no parallel agents

### 4. EFFORT SIGNAL

EC-29→33 planned trilogy + **EC-34 regression** correctly one PR each. Live verify and counsel are **human calendar**, not more extract briefs. Do not invent EC-35 unless Mac paste shows a new systematic miss.

### 5. BLOCKED / NEEDS A HUMAN (Aziz / Mac)

1. **Live 8/8** on tip ≥ `fc64987` (recipe below) → paste TSV / analysisIds into chat or refresh this doc.  
2. **Counsel email** → `packet sent <date>`.  
3. **Drive GT score**.  
4. **Product call** after paste: green vs still hardening-first.  
5. Kaizen K EC 7.3 hygiene if bridge `completeOnAttach` missed.

### 6. NEXT TASK SHOULD ACCOUNT FOR

1. Prefer **Mac / local agent** for any golden-set work — never cloud-only.  
2. Pass-bar expectations after EC-34 (see table).  
3. Ex7 stima `not_found` after micro-chunk = **honest OK**, not a new brief by default.  
4. Do **not** brief public enable / payments as G1-green.  
5. Keep `Example 1 ` trailing space; same-shell AI; ~90s cooldown; MinIO on `/Volumes/Muba/easycasa-minio-data`.

---

## Live evidence timeline

### A) 2026-08-13 (tip ~`1f1269b`, pre EC-32/33)

8/8 ready. Ex2 avviso ✓ 36039/64906. Occupazione hit 8/8. Urbanistica miss 8/8. Ex5 stima=84 bogus. → drove EC-32/33.

### B) 2026-08-14 morning (tip `c67c8ad`, post EC-32/33, pre EC-34)

8/8 ready. Wins: urbanistica structured hit 8/8; Ex5 stima → 156000; Ex8 A cauzione derived.  
**Pass-bar breaks:**
- Ex2 lotto 7: **prezzo_base=153850 / offerta=115387.5** (want 64906/48680)
- GT-5 H: `urb=non_conforme` with `difformita=0` (orphaned stato)

Logs: `/Users/azm/easycasa-g1-results/20260814_GT*.log`

### C) EC-34 merge + deploy (same day)

PR [#154](https://github.com/aziz-mubasher/EasyCasa/pull/154) → `fc64987`. VPS api+ai Recreated. Feedback: `docs/audits/EC-34-completion-feedback.md`.

### D) Cloud attempt to re-verify (this agent)

Tip `598c9a3` ≥ `fc64987`. Drive path missing. Pytest **53/53**. **Live 8/8 not run.**

---

## Pass-bar checklist (Mac re-run ≥ `fc64987`)

| Check | Expect | Green if |
| --- | --- | --- |
| Ex2 lotto 4 | `prezzo_base=36039` | unchanged |
| Ex2 lotto 7 | `prezzo_base=64906`, `offerta_minima=48680` | restored (not 153850) |
| GT-5 lotto H | stato `non_rilevato` **or** `conforme`; never bare `non_conforme` + empty difformita | clean |
| Ex7 stima | value filled **or** honest `not_found` | either OK |
| GT-4 | stima hit reconciled — not listed under `meta.not_found` when value present | reconciled |
| Ex8 A/B | cauzione derive parity when same avviso pct + `prezzo_base` | both derive or both honest miss |
| Pipeline | 8/8 `ready`, zero invented values | standing |

If all land → **eval pass bar green** (note Ex7 `not_found` as acceptable-honest). Full G1 still needs counsel send.

---

## Operator recipe (AZM Mac only)

```bash
cd /Volumes/Muba/EasyCasa && git pull --ff-only && git log -1 --format=%h   # must be ≥ fc64987
# Start AI IN THIS SHELL, then:
export EVAL_LIVE=1 ASTE_ANALYSIS_ENABLED=true ALLOW_PROVIDER_STUBS=true
# AI_URL S3_ENDPOINT MEILI_URL REDIS_URL DATABASE_URL AI_INTERNAL_TOKEN — same as 2026-08-14
BASE="/Volumes/Muba/Easy Casa Italia/EC Aste "
OUT=/Users/azm/easycasa-g1-results; DATE_TAG=20260814_post34; COOLDOWN=90
pnpm --filter @easycasa/api run aste:eval "${BASE}/Example 1 "
pnpm --filter @easycasa/api run aste:eval "${BASE}/Example 2" --lotto 4
pnpm --filter @easycasa/api run aste:eval "${BASE}/Example 2" --lotto 7
pnpm --filter @easycasa/api run aste:eval "${BASE}/Example 4"
pnpm --filter @easycasa/api run aste:eval "${BASE}/Example 5"
pnpm --filter @easycasa/api run aste:eval "${BASE}/Example 7" --lotto H
pnpm --filter @easycasa/api run aste:eval "${BASE}/Example 8" --lotto A
pnpm --filter @easycasa/api run aste:eval "${BASE}/Example 8" --lotto B
# ~90s between cases; keep AI alive in same shell
```

---

## Extract task ledger (closed for engineering)

| Task | Status | SHA / PR |
| --- | --- | --- |
| EC-29 chunking + eval DX | merged+deployed | `57b0f1f` |
| EC-30 field precedence / occupazione / cauzione derive | merged+deployed | #134 `fab9973` |
| EC-31 scorer + runbook | merged+deployed | #136 `0ebf1be` |
| EC-32 urbanistica + cauzione patterns | merged+deployed | #144 `0b861ee` |
| EC-33 valore_stima guards | merged+deployed | #146 `fe1e0c7` |
| EC-34 lot-bleed / orphaned stato / micro-chunk | merged+deployed | #154 `fc64987` |

---

*End of G1 post–EC-34 R&D report. Update paste stub after Mac 8/8.*
