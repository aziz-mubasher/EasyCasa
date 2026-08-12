# G1 — Analisi Aste status report (for Claude / R&D)

**Date:** 2026-08-12 (post-deploy update)  
**Operator:** Cursor agent on AZM Mac (Drive golden PDFs) + VPS deploy  
**Shipped:** `main` @ **`57b0f1f`** — merge of extract chunking + G1 eval runner; **deployed** to `banks4all-vps` `/opt/easycasa-ita` (`api` + `ai` Recreated). Live `/api/version` reports `gitSha: 57b0f1f`.  
**Flags:** `ASTE_ANALYSIS_ENABLED` remains **off** in production — G2 / `docs/runbooks/aste-enable.md` still govern public enable.  
**Spec:** `docs/runbooks/aste-g1-gate.md`

---

## Operator summary (forwardable)

| G1 piece | Status | Notes |
| --- | --- | --- |
| Eval pass bar | **Conscious near-miss / hardening-first** | Ex2 avviso OK; GT-5 lotto H **not** non-conform ✓ (`extract_chunked:7`); systematic misses on `occupazione` + `valore_stima` |
| Counsel packet **sent** | **NOT DONE** | Docs 1–8 on disk; email send is human |
| Waitlist read | **WAIVED** | Prod snapshot 2026-08-11: 1 lead |
| Code on `main` + VPS | **DONE** | `57b0f1f` — chunked extract + eval DX shipped and live on AI/API containers |

**Call for R&D:** G1 is **not** green. Engineering transport blockers for Ex7 are **closed**. Next briefs: field quality (`occupazione`, `valore_stima`, cauzione `importo`), eval scorer unwrap, runbook truth-up, **human counsel send**. Do **not** enable analysis flags.

---

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE / what G1 means and gate call

**What G1 is:** `eval pass bar` + `counsel packet sent` + `waitlist read (met or waived)`. Counsel **answers** → **G2**. Public enable → `docs/runbooks/aste-enable.md`.

**Done**
- Live golden-set eval on Drive PDFs (host stack on Mac).
- Waitlist **WAIVED**.
- Counsel files 1–8 verified present (not emailed).
- Ex7 extract size fixed via **map-reduce chunking** (~90k chars); GT-5 re-run **ready**.
- Landed on **`main`** and **deployed** `api` + `ai` to production VPS (`57b0f1f`).

**Not done**
- Counsel email / `packet sent <date>`.
- Full field scoring vs Drive `EC_Aste_GoldenSet_GroundTruth_v1.md` (not in git).
- Closing systematic `occupazione` / `valore_stima` misses.

**Gate call: conscious near-miss → hardening-first** (unchanged product stance).

| Pass-bar item | Result |
| --- | --- |
| Economics + page refs | Partial — many `prezzo_base` / `offerta_minima` hits; **`valore_stima` miss all ready runs** |
| Occupazione | **Fail** — null/miss every ready run |
| Lotto H not non-conform | **Pass (verified)** — GT-5 `dd18c297-…`, `difformita=[]` |
| Ex2 avviso (€36.039 / €64.906) | **Pass** — 36039 / 64906 |
| Zero invented values | Appears clean on sampled rows; not fully GT-scored |

### 2. WHERE THE BRIEF / RUNBOOK FAILED YOU

| Type | Detail |
| --- | --- |
| Wrong env | Compose assumed; Docker on `/Volumes/Muba` breaks AppleDouble — used host PG17 + Redis/MinIO/Meili/AI |
| Wrong invoke | `tsx` breaks Nest DI → must `build` + `node -r reflect-metadata dist/aste/aste-eval.js` (now in `aste:eval` script) |
| Missing deps | Host **tesseract + ita** for OCR |
| Ex8 lot | Runbook `—` but pipeline needs `--lotto A\|B` |
| Rate limits | Live **429** without backoff burns suite — backoff shipped |
| Disk | System ~99% full → MinIO on `/Volumes/Muba/easycasa-minio-data` |
| GT file | Ground truth Drive-only, not in git |
| Scorer | Nested money → `[object Object]` in eval paste |
| ~~Ex7 400~~ | **Resolved** by chunking; do not re-brief as primary blocker |

### 3. REPO REALITY CHECK

- **Stack:** pnpm monorepo · Nest API · FastAPI AI (Py 3.12) · Next web · shared · migration · infra (Traefik on VPS).
- **Prod tip:** `57b0f1f` — `api` + `ai` force-recreated 2026-08-12; health OK.
- **Aste on main (flags off):** EC-21…EC-26 (+23b, EC-28). Extract: `services/ai/app/services/aste_extract.py` with **429 backoff** + **chunked map-reduce** (`MAX_EXTRACT_USER_CHARS = 90_000`, lot-priority pack, deterministic merge, other-lot `non_conforme` drop when `lotto_label` set). Warning: `extract_chunked:N`.
- **Eval:** `apps/api` `aste:eval` compiled path; AppleDouble skip; `process.exit(0)` after Nest close.
- **Enable:** still G2 — do not flip `ASTE_ANALYSIS_ENABLED` from this report.

### 4. EFFORT SIGNAL

Much larger than “run compose checklist.” Infra + tooling dominated calendar time; golden-set wall-clock hours; chunking unblocked GT-5. Remaining miss is **field quality**, not extract transport.

Split next briefs: (A) occupazione + valore_stima, (B) eval DX / runbook, (C) counsel send. Do **not** re-open Ex7 size as the main task unless chunking regresses in prod.

### 5. BLOCKED / NEEDS A HUMAN

1. **Counsel email** — package 1–8 + LGL-1; requested response date; paste `packet sent <date>`.  
2. **Drive GT scoring** — human with `EC_Aste_GoldenSet_GroundTruth_v1.md`.  
3. **Mac disk hygiene** — keep MinIO off full system volume.  
4. **Product call** — confirm near-miss → hardening-first vs hard-fail until occupazione/valore_stima green.  
5. ~~Commit / deploy~~ — **done** (`57b0f1f` on `main` + VPS).

### 6. NEXT TASK SHOULD ACCOUNT FOR

1. Chunking **shipped and deployed** — GT-5 verified; don’t re-spec Ex7 400 unless regression.  
2. Hardening: `occupazione`, `valore_stima`, cauzione nested `importo`.  
3. Eval scorer unwrap `{value|importo}` + page.  
4. Runbook: compiled eval, tesseract, Ex8 lots, host-stack note, MinIO free space, `extract_chunked:N`.  
5. Consistent `.env` (no empty `OPENAI_API_KEY=` winning loaders).  
6. Do **not** brief public enable / payments as G1-green.  
7. Disk path: `Example 1 ` has trailing space.

---

## Eval paste tables (pipeline / DB)

```
## GT-1 / Example 1 / lotto unico
analysisId: 5bf241f2-cd2e-4646-b139-3fa15deef73f
status: ready
economics.valore_stima    miss
economics.prezzo_base     hit        52250.4        1
economics.offerta_minima   hit        39187.8
economics.cauzione        hit        5225.04 / 10%  1
occupazione               miss

## GT-2 / Example 2 / lotto 4
analysisId: 638adb7b-bd99-4e7b-aedd-8b6e8c97aa32
status: ready
economics.prezzo_base     hit        36039          1      avviso ✓
economics.offerta_minima   hit        27029          1
occupazione               miss

## GT-2 / Example 2 / lotto 7
analysisId: ce93e40a-d9ce-4dca-b576-3e29c7d96e3d
status: ready
economics.prezzo_base     hit        64906          2      avviso ✓
economics.offerta_minima   hit        48680          2
occupazione               miss

## GT-3 / Example 4 / unico
analysisId: 17d3bd78-431f-484d-a257-14b9ef535c88
status: ready
economics.prezzo_base     hit        242776         2
economics.offerta_minima   hit        182082
economics.cauzione        hit        24277.6 / 10%  2
occupazione               miss

## GT-4 / Example 5 / lotto 001
analysisId: f8687357-dadb-4ad6-a89c-e2587a0a5a38
status: ready
economics.prezzo_base     hit        156000         1
economics.offerta_minima   hit        117000         1
economics.cauzione        hit        31200 / 20%    1
occupazione               miss

## GT-5 / Example 7 / lotto H
analysisId: dd18c297-a6e1-4d95-9bd8-60f68205d1e8
status: ready
meta.warnings: extract_chunked:7
economics.prezzo_base     hit        100355.25
economics.offerta_minima   hit        75266.44
economics.cauzione        miss       pct=10, importo null
economics.valore_stima    miss
occupazione               miss
urbanistica               pass       NOT non-conform ✓

## GT-8 / Example 8 / lotto A
analysisId: f03a84bf-6783-4376-8c12-4d8c6d91b4be
status: ready
economics.prezzo_base     hit        130000
occupazione               miss

## GT-8 / Example 8 / lotto B
analysisId: e5873551-dafb-4bb7-b3b4-c9448f841d9b
status: ready
economics.prezzo_base     hit        130000
economics.rilancio_minimo  hit        1000
occupazione               miss
```

### G1 paste stub

```
packet sent: NOT YET
waitlist: WAIVED — 1 lead (2026-08-11)
eval: near-miss / hardening-first — Ex2 avviso OK; GT-5 ready extract_chunked:7 lotto H not non-conform OK; occupazione+valore_stima systematic miss
shipped: main 57b0f1f deployed api+ai (chunked extract live on VPS); flags still off
```

---

## Shipped deltas (now on main / VPS)

| Change | Why |
| --- | --- |
| `aste_extract.py` ~90k map-reduce + other-lot non-conforme drop | Unblocked GT-5 / Ex7 OpenAI 400 |
| `aste_extract.py` 429 backoff | Live suite rate limits |
| `apps/api` `aste:eval` → build + `reflect-metadata` | Nest DI under eval |
| `aste-eval.ts` AppleDouble skip + `process.exit(0)` | Corrupt uploads / hung suite |
| `docs/audits/G1-aste-status-rnd-feedback.md` | This report |

---

*End of G1 status report for R&D (post-deploy).*
