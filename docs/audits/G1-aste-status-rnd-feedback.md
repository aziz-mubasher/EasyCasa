# G1 — Analisi Aste status report (for Claude / R&D)

**Date:** 2026-08-12  
**Operator:** Cursor agent on AZM Mac (Drive golden PDFs)  
**Branch at run:** `cursor/aste-g1-pgvector-arm-2145` (local host stack; not VPS enable)  
**Flags:** `ASTE_ANALYSIS_ENABLED` remains **off** in production — G2 / `docs/runbooks/aste-enable.md` still govern public enable.  
**Spec:** `docs/runbooks/aste-g1-gate.md`

---

## Operator summary (forwardable)

| G1 piece | Status | Notes |
| --- | --- | --- |
| Eval pass bar | **Conscious near-miss / hardening-first** | Ex2 avviso precedence OK; GT-5 (lotto H) unblocked via extract chunking — not marked non-conform ✓; systematic misses still on `occupazione` + `valore_stima` |
| Counsel packet **sent** | **NOT DONE** | Core docs 1–8 present under `docs/legal/`; email send is human |
| Waitlist read | **WAIVED** | Prod snapshot 2026-08-11: 1 lead (runbook) |

**Call for R&D:** Do **not** treat G1 as green. Paste eval tables below into the EC-27 / hardening brief. Do **not** enable analysis flags. Next engineering focus: occupazione + valore_stima hardening, eval scorer nested-amount unwrap, runbook updates (compiled eval, host deps). Ex7 size / extract 400 is no longer the primary blocker — chunking shipped; GT-5 ready with `extract_chunked:7`.

---

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE / what G1 means and gate call

**What G1 is (runbook, not inventable):**  
`eval pass bar` + `counsel packet sent` + `waitlist read (met or waived)`. Counsel **answers** unlock **G2**, not G1. Public flag enable = `docs/runbooks/aste-enable.md`.

**What we did against the runbook**
- Ran the minimum meaningful golden set live (`EVAL_LIVE=1`) against Drive folders under `/Volumes/Muba/Easy Casa Italia/EC Aste /`.
- Confirmed waitlist **WAIVED** (already recorded in runbook; volume far below 100 / ≥20-in-one-province).
- Verified counsel package files 1–8 exist on disk (`docs/legal/counsel-send-checklist.md` rows).
- Did **not** send counsel email (requires Aziz / human + requested response date).
- Re-ran GT-5 after extract map-reduce chunking landed; lotto H pass-bar item now verifiable.

**Gate call: conscious near-miss → hardening-first**  
Runbook explicitly allows near-misses to shape hardening / EC-27 rather than auto-killing the gate. We are **not** calling G1 pass — overall still near-miss while `occupazione` + `valore_stima` remain systematic:

| Pass-bar item | Result |
| --- | --- |
| Economics + page refs (`prezzo_base`, `offerta_minima`, `cauzione`, `valore_stima`) | Partial — several `prezzo_base` / `offerta_minima` / `cauzione` hits; **`valore_stima` miss on all ready runs** (incl. GT-5 re-run) |
| Occupazione correct on all cases | **Fail** — miss / null on every ready run |
| Lotto H not marked non-conform | **Pass (verified)** — GT-5 ready; urb/cat null, `difformita=[]`; NOT marked non-conform |
| Ex2 avviso precedence (€36.039 / €64.906) | **Pass** — lotto 4 → `36039`, lotto 7 → `64906` (not ordinanza `85425`) |
| Zero invented values → `meta.not_found` | Appears clean on sampled rows (`not_found: []`); not fully scored vs Drive GT file |

### 2. WHERE THE BRIEF / RUNBOOK FAILED YOU

| Type | Detail |
| --- | --- |
| **Wrong / incomplete env** | Runbook assumes `docker compose … up -d db minio api ai`. On this Mac, Docker builds from `/Volumes/Muba` break on AppleDouble `._*` / `xattr`; engine was flaky. Operator path became **Homebrew Postgres 17 + host Redis/MinIO/Meili/AI**. |
| **Wrong invoke** | Runbook shows `pnpm … aste:eval` as if `tsx` were fine. Bare `tsx` **breaks Nest DI** (`emitDecoratorMetadata` → `Cannot read properties of undefined`). Working path: **`pnpm run build && node -r reflect-metadata dist/aste/aste-eval.js`** (now in `apps/api` script `aste:eval`). |
| **Missing host deps** | OCR needs **tesseract + `ita`** (+ poppler already present). Without them → `ocr_upstream` / `TesseractNotFoundError`. Not mentioned in G1 runbook. |
| **Missing multi-lot for Ex8** | Runbook table says GT-8 Example 8 lot `—`. Pipeline returned `lotto_selection_required:A,B`. Had to run `--lotto A` and `--lotto B`. Update the table. |
| **Missing rate-limit guidance** | Live extract hit OpenAI **429** heavily; without backoff + spaced runs the suite burns the quota. Added retry in AI service (local change). |
| **Missing disk guidance** | System disk ~**99%** full → MinIO `XMinioStorageFull`. Data dir relocated to `/Volumes/Muba/easycasa-minio-data`. |
| **Ambiguous scoring** | Ground truth file `EC_Aste_GoldenSet_GroundTruth_v1.md` is **not in git** (Drive only). Hit/miss below is pipeline output vs runbook pass bar, **not** full GT field scoring. |
| **Over-assumed shape** | Extract returns nested money objects (`{value, source}` / `{importo, source}`). Eval scorer often prints `[object Object]` — values must be read from DB JSON. |

### 3. REPO REALITY CHECK

- **Monorepo:** pnpm · `apps/web` Next.js · `apps/api` NestJS · `services/ai` FastAPI (Python 3.12 venv; 3.14 failed pydantic builds) · `packages/shared` · `migration` · `infra`.
- **Aste shipped on main (feature flags off):** EC-21…EC-26 (+ EC-23b lotto, EC-28 Banks4All aste block). Migrations **0046–0051** (aste); local eval DB was migrated further (through **0063** on this machine).
- **Eval entry:** `apps/api/src/aste/aste-eval.ts` · package script now compiles then runs `dist/aste/aste-eval.js` with `reflect-metadata`.
- **AI extract:** `services/ai/app/services/aste_extract.py` — OpenAI chat completions + JSON schema v2; **429 backoff** (6 attempts, Retry-After / exponential); **extract chunking shipped** (≈90k char map-reduce). GT-5 live re-run used it (`meta.warnings: extract_chunked:7`) and reached `ready`.
- **OCR:** `aste_ocr.py` via pytesseract; requires host `tesseract` + lang data.
- **Multi-lot:** post EC-23b, `--lotto` / `EC_ASTE_EVAL_LOTTO` required or `lotto_selection_required:…`.
- **Counsel:** LGL-1 at `docs/legal/aste-counsel-addendum-lgl1.md`; send checklist lists rows 1–8.
- **Enable path:** still G2 + `docs/runbooks/aste-enable.md` — do not flip `ASTE_ANALYSIS_ENABLED` from this report.
- **Local operator artifacts (not secrets):** results under `/Users/azm/easycasa-g1-results/`; MinIO on external volume as above.

### 4. EFFORT SIGNAL

Much **larger** than “run the checklist on compose.” Roughly:

- Infra improvisation (no reliable Docker on Muba volume) ≈ majority of calendar time  
- Dep/tooling discoveries (tsx DI, tesseract, MinIO disk, OpenAI 429/400) ≈ significant  
- Actual golden-set wall-clock with OCR + LLM + cooldowns ≈ hours  
- Ex7 size fix (chunking) unblocked GT-5; remaining miss is field quality, not extract transport  

Should stay **one gate**, but Claude should split next work: (A) field quality (occupazione, valore_stima), (B) eval DX / runbook truth, (C) human counsel send — not one mega-brief. Ex7 chunking is done; do not re-brief it as the primary blocker.

### 5. BLOCKED / NEEDS A HUMAN

1. **Counsel email** — attach core package 1–8 + LGL-1; request response date; reply in chat with `packet sent <date>` for G1 paste.  
2. **Drive ground-truth scoring** — open `EC_Aste_GoldenSet_GroundTruth_v1.md` and mark true hit/miss (agent cannot see Drive file in git).  
3. **Disk hygiene on Mac** — system volume ~3 Gi free; Docker Desktop cache ~6 Gi; keep MinIO off `/tmp` on full boot disk.  
4. **OpenAI quota / model choice** — 429 on burst still real; Ex7 **400** size path is addressed by chunking (GT-5 verified). Keep an eye on chunk quality regressions.  
5. **Product call on G1** — confirm conscious near-miss → hardening-first (recommended) vs hard fail until occupazione + valore_stima green. GT-5 lotto H non-conform bar is no longer blocking.  
6. **Commit hygiene** — local fixes (`aste:eval` script, `process.exit(0)`, 429 backoff, extract chunking, empty `.env` OPENAI placeholder comment, AppleDouble skip if present) may still be uncommitted / mixed with infra branch work — AZM to land clean PR(s).

### 6. NEXT TASK SHOULD ACCOUNT FOR

1. **Extract chunking shipped** in `services/ai/app/services/aste_extract.py` (≈90k char map-reduce). GT-5 re-run: `analysisId dd18c297-…`, `ready`, `meta.warnings: extract_chunked:7`. Do **not** re-open Ex7 size as the primary blocker unless chunking regresses.  
2. **Hardening targets for EC-27 brief:** `occupazione` (all GT miss), `valore_stima` (all miss), cauzione nested `importo` normalization. Lotto H negative-space conformita is **verified pass** — not a remaining unknown.  
3. **Eval scorer:** unwrap `{value|importo}` + `source.page` so paste tables are trustworthy without psql.  
4. **Runbook updates:** compiled `aste:eval`; host tesseract; Ex8 multi-lot; optional host-stack path when Docker on external volume fails; MinIO free-space note; note chunked extract / `extract_chunked:N` warning.  
5. **Ops:** keep AI `OPENAI_API_KEY` / `CHAT_PROVIDER=openai` consistent — `.env` had an empty `OPENAI_API_KEY=` earlier that won for some loaders; comment placeholders.  
6. **Do not** brief public enable or payment (EC-27) as “G1 green” until counsel **sent** + product accepts near-miss (occupazione / valore_stima still systematic).  
7. Example 1 folder on disk is `Example 1 ` (trailing space) — scripts must use the real path.

---

## Eval paste tables (pipeline / DB)

Scores are **pipeline outputs** from local ready rows. Page refs incomplete where model returned nested objects without clean page in scorer.

```
## GT-1 / Example 1 / lotto unico
analysisId: 5bf241f2-cd2e-4646-b139-3fa15deef73f
status: ready
failureReason: —

field                     hit/miss   value          page   notes
economics.valore_stima    miss
economics.prezzo_base     hit        52250.4        1      avviso
economics.offerta_minima   hit        39187.8
economics.cauzione        hit        5225.04 / 10%  1
occupazione               miss
conformita / non-conform  miss
invented_values           0         (meta.not_found empty)

## GT-2 / Example 2 / lotto 4
analysisId: 638adb7b-bd99-4e7b-aedd-8b6e8c97aa32
status: ready
economics.prezzo_base     hit        36039          1      avviso ✓ (not ordinanza 85425)
economics.offerta_minima   hit        27029          1
economics.cauzione        miss       pct=10 only, importo null
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
urbanistica               partial    free-text non-conforme note; structured flags null

## GT-5 / Example 7 / lotto H
analysisId: dd18c297-a6e1-4d95-9bd8-60f68205d1e8
status: ready
failureReason: null
meta.warnings: extract_chunked:7
economics.prezzo_base     hit        100355.25
economics.offerta_minima   hit        75266.44
economics.cauzione        miss       pct=10 only, importo null
economics.valore_stima    miss
occupazione               miss
urbanistica               pass       NOT non-conform (urb/cat null, difformita=[]) — lotto H pass-bar ✓
notes: chunking in aste_extract.py (90k map-reduce); Ex7 size no longer blocking

## GT-8 / Example 8 / lotto A
analysisId: f03a84bf-6783-4376-8c12-4d8c6d91b4be
status: ready
economics.prezzo_base     hit        130000         1
economics.offerta_minima   hit        97500          1
occupazione               miss
note: runbook had no lot; multi-lot required --lotto A|B

## GT-8 / Example 8 / lotto B
analysisId: e5873551-dafb-4bb7-b3b4-c9448f841d9b
status: ready
economics.prezzo_base     hit        130000         1
economics.offerta_minima   hit        97500          1
economics.rilancio_minimo  hit        1000           1
occupazione               miss
```

### G1 paste stub (incomplete until counsel sent)

```
packet sent: NOT YET
waitlist: WAIVED — 1 lead total (2026-08-11); below volume threshold; runway short
eval: near-miss / hardening-first — see tables above; GT-5 ready (extract_chunked:7), lotto H not non-conform OK; occupazione+valore_stima systematic miss; Ex2 avviso OK
```

---

## Local code deltas worth landing (for Claude awareness)

Not all may be committed on the branch tip used for infra:

| Change | Why |
| --- | --- |
| `apps/api` `aste:eval` → build + `node -r reflect-metadata` | Nest DI under eval |
| `aste-eval.ts` `process.exit(0)` after `app.close()` | Nest left event loop alive; suite hung |
| `aste_extract.py` 429 backoff | Live golden-set otherwise fails fast |
| `aste_extract.py` ~90k char map-reduce chunking | Unblocked GT-5 / Ex7 OpenAI 400; GT-5 showed `extract_chunked:7` |
| Host tesseract + MinIO on `/Volumes/Muba/…` | Operator-only; document in runbook |

---

*End of G1 status report for R&D.*
