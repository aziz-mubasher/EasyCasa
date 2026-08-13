# G1 — Analisi Aste status report (for Claude / R&D)

**Date:** 2026-08-13 (full golden-set re-run)  
**Operator:** Cursor agent on AZM Mac (Drive golden PDFs)  
**Code tip:** `main` includes extract chunking (`57b0f1f`), field-quality work (`fab9973` / EC-30), eval DX + runbook (`0ebf1be` / EC-31). Tip HEAD at report time: `1f1269b`.  
**Flags:** `ASTE_ANALYSIS_ENABLED` remains **off** in production — G2 / `docs/runbooks/aste-enable.md` still govern public enable.  
**Spec:** `docs/runbooks/aste-g1-gate.md`  
**Raw logs:** `/Users/azm/easycasa-g1-results/GT*.log` (Mac operator path; not in git)

---

## Operator summary (forwardable)

| G1 piece | Status | Notes |
| --- | --- | --- |
| Eval pass bar | **Conscious near-miss / hardening-first** | **8/8 `ready`**. Ex2 avviso OK (36039 / 64906). GT-5 lotto H **not** non-conform ✓ (`extract_chunked:7`). Occupazione now often populated (vs prior systematic null). Remaining gaps: `urbanistica.conformita` (all miss), nested `cauzione.importo` on several lots, `valore_stima` miss on Ex2 + Ex7; GT-4 `valore_stima=84` looks wrong |
| Counsel packet **sent** | **NOT DONE** | Docs 1–8 on disk; email send is human |
| Waitlist read | **WAIVED** | Prod snapshot 2026-08-11: 1 lead |
| Code on `main` | **DONE** | Chunking + EC-30/31 landed; do not re-brief Ex7 400 as primary blocker |

**Call for R&D:** G1 is **still not green**. Pipeline transport is fine. Next briefs: urbanistica conformity extraction, cauzione nested `importo`, suspicious/stale `valore_stima` (Ex5=84), Drive GT human score, **human counsel send**. Do **not** enable analysis flags.

---

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE / what G1 means and gate call

**What G1 is:** `eval pass bar` + `counsel packet sent` + `waitlist read (met or waived)`. Counsel **answers** → **G2**. Public enable → `docs/runbooks/aste-enable.md`.

**Done (2026-08-13 re-run)**
- Live golden-set eval on Drive PDFs via host stack (PG17 + Redis + MinIO on `/Volumes/Muba/easycasa-minio-data` + Meili + AI). One-shell suite so AI survives mid-run.
- All eight cases: GT-1, GT-2×2, GT-3, GT-4, GT-5 lotto H, GT-8×2 → **`status: ready`**, exit 0.
- Waitlist still **WAIVED**.
- Counsel files 1–8 still present (not emailed).
- Ex7 still healthy under chunking (`extract_chunked:7`); lotto H not marked non-conform.

**Not done**
- Counsel email / `packet sent <date>`.
- Full field scoring vs Drive `EC_Aste_GoldenSet_GroundTruth_v1.md` (not in git).
- Closing systematic `urbanistica.conformita` miss + remaining economics nesting gaps.

**Gate call: conscious near-miss → hardening-first** (unchanged product stance).

| Pass-bar item | Result (2026-08-13) |
| --- | --- |
| Economics + page refs | Stronger than prior run — `prezzo_base` / `offerta_minima` hit on all ready cases; `valore_stima` hit GT-1/3/4/8A/8B; **miss Ex2×2 + Ex7**; GT-4 stima **84** is likely a bad extract |
| Occupazione | **Improved** — hit with values on all 8 (`libero` / `non_rilevato` / `occupato_senza_titolo`). Detail/opponibilita often still `not_found` |
| Lotto H not non-conform | **Pass** — GT-5 `b6f41726-…`, scorer `difformita=0`, warning `extract_chunked:7` |
| Ex2 avviso (€36.039 / €64.906) | **Pass** — 36039 / 64906 |
| Urbanistica | **Fail** — `urbanistica.conformita` miss on every case (scorer line is noisy / shared with H note) |
| Zero invented values | `meta.not_found` populated where miss; not fully GT-scored vs Drive |

### 2. WHERE THE BRIEF / RUNBOOK FAILED YOU

| Type | Detail |
| --- | --- |
| Wrong env | Compose assumed; Docker on `/Volumes/Muba` breaks AppleDouble — host PG17 + Redis/MinIO/Meili/AI |
| AI lifecycle | Background AI shells get reaped → suite must start AI **in the same long-lived shell** (or mid-suite restart). First parallel suite aborted `AI_DOWN` exit 2 |
| Wrong invoke | `tsx` breaks Nest DI → `aste:eval` must `build` + `node -r reflect-metadata` (shipped) |
| Missing deps | Host **tesseract + ita** (+ poppler) for OCR |
| Ex8 lot | Pipeline needs `--lotto A\|B` (runbook now documents this) |
| Rate limits | Live **429** without backoff burns suite — backoff shipped |
| Disk | System volume often ~full → MinIO on `/Volumes/Muba/easycasa-minio-data` |
| GT file | Ground truth Drive-only, not in git |
| Scorer | Nested money used to print `[object Object]` — improved but urbanistica / cauzione paste still thin |
| ~~Ex7 400~~ | **Resolved** by chunking; do not re-brief as primary blocker |

### 3. REPO REALITY CHECK

- **Stack:** pnpm monorepo · Nest API · FastAPI AI (Py 3.12) · Next web · shared · migration · infra (Traefik on VPS).
- **Aste extract:** `services/ai/app/services/aste_extract.py` — OpenAI **429 backoff** + **map-reduce chunking** (`MAX_EXTRACT_USER_CHARS ≈ 90k`, lot-priority pack, merge, drop other-lot `non_conforme` when `lotto_label` set). Warning: `extract_chunked:N`.
- **Eval:** `apps/api` `pnpm --filter @easycasa/api run aste:eval` → compiled path; AppleDouble skip; `process.exit(0)` after Nest close.
- **Later landings on main:** EC-30 field quality / cauzione derive; EC-31 eval DX + G1 runbook truth-up — tonight’s re-run reflects that tip.
- **Enable:** still G2 — do not flip `ASTE_ANALYSIS_ENABLED` from this report.

### 4. EFFORT SIGNAL

Tonight’s re-run ~50 minutes wall-clock (90s cooldown between cases) once AI stayed alive. Infra/tooling debt already paid earlier; remaining work is **field quality + human gate steps**, not extract transport.

Split next briefs: (A) urbanistica + cauzione `importo`, (B) audit `valore_stima` false positives (Ex5=84) / Ex2+Ex7 misses, (C) counsel send + Drive GT score. Do **not** re-open Ex7 size unless chunking regresses.

### 5. BLOCKED / NEEDS A HUMAN

1. **Counsel email** — package 1–8 + LGL-1; requested response date; paste `packet sent <date>`.  
2. **Drive GT scoring** — human with `EC_Aste_GoldenSet_GroundTruth_v1.md`.  
3. **Mac disk hygiene** — keep MinIO off full system volume.  
4. **Product call** — confirm near-miss → hardening-first vs hard-fail until urbanistica/cauzione green.  
5. ~~Chunking / deploy / eval runner~~ — already on `main`.

### 6. NEXT TASK SHOULD ACCOUNT FOR

1. Chunking **shipped** — GT-5 verified again 2026-08-13; don’t re-spec Ex7 400 unless regression.  
2. Hardening priority shift: **`urbanistica.conformita`**, nested **`cauzione.importo`**, **`valore_stima`** quality (miss Ex2/Ex7; bogus Ex5=84). Occupazione is no longer the #1 systematic null.  
3. Eval scorer: keep unwrapping `{value|importo}` + page; quiet the shared “lotto H” note on non-H cases.  
4. Operator recipe: host stack + **same-shell AI** + MinIO on external volume + `Example 1 ` trailing space.  
5. Consistent `.env` (no empty `OPENAI_API_KEY=` winning loaders).  
6. Do **not** brief public enable / payments as G1-green.

---

## Eval paste tables (2026-08-13 suite)

```
## GT-1 / Example 1 / lotto unico
analysisId: 9aeb85f7-d902-4ada-8318-39d90dc63b87
status: ready
economics.valore_stima       hit   58056       p17
economics.prezzo_base        hit   52250.4
economics.offerta_minima     hit   39187.8
economics.cauzione           hit   5225.04 / 10%  p2
economics.rilancio_minimo    hit   5000
giuridica.stato_occupazione  hit   libero
urbanistica.conformita       miss

## GT-2 / Example 2 / lotto 4
analysisId: dd7c67a4-a53e-430a-868a-2dcc47f9c1e8
status: ready
meta.warnings: extract_chunked:2
economics.valore_stima       miss  (not_found)
economics.prezzo_base        hit   36039       p1   avviso ✓
economics.offerta_minima     hit   27029       p1
economics.cauzione           hit   10%         p5   (importo thin)
economics.rilancio_minimo    hit   1000        p1
giuridica.stato_occupazione  hit   non_rilevato
urbanistica.conformita       miss

## GT-2 / Example 2 / lotto 7
analysisId: 4f87dddf-fc97-454d-b42a-0f52a0103591
status: ready
meta.warnings: extract_chunked:2
economics.valore_stima       miss  (not_found)
economics.prezzo_base        hit   64906       p1   avviso ✓
economics.offerta_minima     hit   48680       p1
economics.cauzione           miss              p4
economics.rilancio_minimo    hit   1500        p1
giuridica.stato_occupazione  hit   non_rilevato
urbanistica.conformita       miss

## GT-3 / Example 4 / unico
analysisId: 12d918a6-2719-46ff-9fc4-e2cf81d9f7a7
status: ready
economics.valore_stima       hit   242776      p14
economics.prezzo_base        hit   242776      p2
economics.offerta_minima     hit   182082      p2
economics.cauzione           hit   24277 / 10% p2
economics.rilancio_minimo    hit   10000       p2
giuridica.stato_occupazione  hit   occupato_senza_titolo — occupato illegittimamente da autovetture
urbanistica.conformita       miss

## GT-4 / Example 5 / lotto 001
analysisId: 559e6566-897a-4f58-8eed-c27009bb253d
status: ready
meta.warnings: extract_chunked:2
economics.valore_stima       hit   84          p16   ⚠ likely wrong
economics.prezzo_base        hit   156000      p1
economics.offerta_minima     hit   117000      p1
economics.cauzione           hit   31200 (derived) / 20%  p1
economics.rilancio_minimo    hit   2000        p1
giuridica.stato_occupazione  hit   occupato_senza_titolo — allestita ad uso abitativo, non autorizzato
urbanistica.conformita       miss

## GT-5 / Example 7 / lotto H
analysisId: b6f41726-dd2a-426c-82a2-003ffa33f801
status: ready
meta.warnings: extract_chunked:7
economics.valore_stima       miss
economics.prezzo_base        hit   100355.25   p4
economics.offerta_minima     hit   75266.44    p4
economics.cauzione           miss              p6
economics.rilancio_minimo    hit   3100        p4
giuridica.stato_occupazione  hit   libero
urbanistica.conformita       miss  (NOT non-conform ✓ — difformita=0)

## GT-8 / Example 8 / lotto A
analysisId: 1cea007c-49f4-46d0-bab6-fc4cb3bf8980
status: ready
meta.warnings: extract_chunked:2
economics.valore_stima       hit   130466.02   p25
economics.prezzo_base        hit   130000      p1
economics.offerta_minima     hit   97500       p1
economics.cauzione           miss              p1
economics.rilancio_minimo    hit   1000        p1
giuridica.stato_occupazione  hit   occupato_senza_titolo
urbanistica.conformita       miss

## GT-8 / Example 8 / lotto B
analysisId: 8582aa49-8ce1-4fad-9e9d-9ef9df510095
status: ready
meta.warnings: extract_chunked:2
economics.valore_stima       hit   130466.02   p25
economics.prezzo_base        hit   130000      p1
economics.offerta_minima     hit   97500       p1
economics.cauzione           miss              p26
economics.rilancio_minimo    hit   1000        p1
giuridica.stato_occupazione  hit   non_rilevato
urbanistica.conformita       miss
```

### Delta vs prior G1 paste (2026-08-12)

| Area | Before | After (2026-08-13) |
| --- | --- | --- |
| Pipeline ready | 8/8 after chunking | 8/8 again |
| Occupazione | systematic miss/null | **hit on all 8** with enum/text |
| valore_stima | miss all ready | hit 5/8; miss Ex2×2 + Ex7; Ex5=84 suspect |
| Urbanistica | thin / H-focused | **systematic conformita miss** still |
| Cauzione | mixed | still miss nested importo on Ex2-7, Ex7, Ex8 A/B |

### G1 paste stub

```
packet sent: NOT YET
waitlist: WAIVED — 1 lead (2026-08-11)
eval: near-miss / hardening-first — 8/8 ready 2026-08-13; Ex2 avviso OK; GT-5 extract_chunked:7 lotto H not non-conform OK; occupazione improved; urbanistica.conformita + cauzione.importo + valore_stima quality remain
shipped: main has chunking+EC-30/31; flags still off
```

---

## Operator recipe used (host stack)

```bash
BASE="/Volumes/Muba/Easy Casa Italia/EC Aste "
# AI must live in the same shell as the suite (or restart mid-suite).
# Env overrides: EVAL_LIVE=1 ASTE_ANALYSIS_ENABLED=true ALLOW_PROVIDER_STUBS=true
# AI_URL / S3_ENDPOINT / MEILI_URL / REDIS_URL / DATABASE_URL / AI_INTERNAL_TOKEN
pnpm --filter @easycasa/api run aste:eval "${BASE}/Example 1 "
pnpm --filter @easycasa/api run aste:eval "${BASE}/Example 2" --lotto 4
pnpm --filter @easycasa/api run aste:eval "${BASE}/Example 2" --lotto 7
pnpm --filter @easycasa/api run aste:eval "${BASE}/Example 4"
pnpm --filter @easycasa/api run aste:eval "${BASE}/Example 5"
pnpm --filter @easycasa/api run aste:eval "${BASE}/Example 7" --lotto H
pnpm --filter @easycasa/api run aste:eval "${BASE}/Example 8" --lotto A
pnpm --filter @easycasa/api run aste:eval "${BASE}/Example 8" --lotto B
```

---

*End of G1 status report for R&D (2026-08-13 re-run).*
