# G1 gate — Dossier Asta (operator checklist)

> **STATUS (2026-08-15):** **G1 FULL GREEN.** Eval pass bar GREEN (product-accepted 2026-08-14) · Counsel **`packet sent 2026-08-15 (response requested by 2026-08-29)`** · Waitlist **WAIVED**. Canonical ledger: `docs/audits/aste-g1-hardening-roadmap-ec29-33.md`. Flags still **off** — G2 / `docs/runbooks/aste-enable.md`. Pre-EC-27: `docs/runbooks/aste-pre-ec27-checklist.md`.

G1 = **eval pass bar** + **counsel packet sent** + **waitlist read** (met or waived).  
Answers from counsel gate **G2**, not G1. Public flag enable is still `docs/runbooks/aste-enable.md`.

Cloud agents **cannot** run the golden-set eval (Drive PDFs stay on AZM Mac). This runbook is for the Mac operator.

**All testing lanes (automated / preview / Stripe / G2):** `docs/runbooks/aste-testing-sop.md`.

---

## 1. Eval run (decisive)

### Ground truth (not in git)

Score against Drive: `EC_Aste_GoldenSet_GroundTruth_v1.md` (**Drive-only — not in this repo**).

Full field scoring vs that document is a **human step** after the eval paste table. The `aste:eval` scorer prints hit/miss rows from the pipeline JSON; it does not auto-grade against Drive GT.

### Minimum meaningful set

| GT case | Example folder (AZM Drive) | Lot label | Why |
| --- | --- | --- | --- |
| GT-1 | `Example 1 ` (note trailing space) | — (unico) | baseline |
| GT-2 | Example 2 | `4` and `7` (two runs) | scanned + prezzo-base precedence |
| GT-3 | Example 4 | — | |
| GT-4 | Example 5 | — | |
| GT-5 | Example 7 | `H` | negative-space trap (must **not** mark non-conform) |
| GT-8 | Example 8 | **`A` and `B`** (two runs; `--lotto` required) | scanned + occupied |

**Path warning:** the GT-1 folder on Drive is literally `Example 1 ` (trailing space). Quote the path exactly in shell commands or scripts will miss the directory.

### Stack up (local)

From repo root on **latest `main`**:

```bash
git pull && pnpm install --frozen-lockfile
# optional if disk is tight:
docker builder prune -af

docker compose -f infra/docker-compose.yml --env-file .env up -d db minio api ai
# apply pending migrations if your local DB is fresh (same as usual local API boot)
```

#### Host-stack fallback (when Docker build fails on external volumes)

On AZM Mac, Docker builds from `/Volumes/Muba/...` can fail on AppleDouble sidecar files (`._*` / xattr). If compose build breaks, run the stack on the **host** instead:

- Postgres 17 (local install)
- Redis, MinIO, Meilisearch, AI service (compose or host)
- API pointed at host Postgres

The eval runner skips `._*` / `.DS_Store` uploads automatically. AppleDouble files must not be uploaded with the dossier PDFs.

#### Host OCR dependencies (required for scanned perizie)

Install on the Mac host (AI service OCR path):

- **Tesseract** + **`ita` language data**
- **poppler** (`pdftoppm` / pdf rendering)

Failure signature in logs: `ocr_upstream` or `TesseractNotFoundError`. Without these, scanned golden-set cases fail before extract.

#### MinIO free space

If the boot disk is nearly full (~99%), MinIO writes fail with `XMinioStorageFull`. Relocate MinIO data off the system volume — operator precedent: `/Volumes/Muba/easycasa-minio-data` (set in compose / `.env` as appropriate).

Ensure `.env` (api + ai share the token):

| Var | Where | Notes |
| --- | --- | --- |
| `ASTE_ANALYSIS_ENABLED=true` | api | local eval only |
| `AI_URL` | api | e.g. `http://localhost:8000` (compose service URL as configured) |
| `AI_INTERNAL_TOKEN` | api **and** ai | same value |
| `CHAT_PROVIDER=openai` | ai | **required** for live extract (must match across api env passthrough and ai service) |
| `OPENAI_API_KEY` | ai | real key — see **`.env` hygiene** below |
| `DATABASE_URL` | api | points at local compose `db` (or host PG in fallback mode) |
| MinIO / S3 creds | api | match compose MinIO |

**`.env` hygiene:** an empty line like `OPENAI_API_KEY=` can win over a real value in some dotenv loaders. In `.env.example` files, secrets are commented out (`# OPENAI_API_KEY=…`); in your local `.env`, either omit the key entirely or set the real value — never leave a blank assignment that overrides a later line.

### Invoke (per dossier, and per lot when multi-lot)

Compiled path (required — `tsx` breaks Nest DI via `emitDecoratorMetadata`):

```bash
pnpm --filter @easycasa/api run aste:eval
# = pnpm run build && node -r reflect-metadata dist/aste/aste-eval.js
```

Dry checklist (lists files + blank table):

```bash
pnpm --filter @easycasa/api run aste:eval "/Volumes/Muba/Easy Casa Italia/EC Aste /Example 5"
```

Live pipeline:

```bash
EVAL_LIVE=1 \
CHAT_PROVIDER=openai \
OPENAI_API_KEY=<key> \
AI_INTERNAL_TOKEN=<shared> \
ASTE_ANALYSIS_ENABLED=true \
pnpm --filter @easycasa/api run aste:eval "/Volumes/Muba/Easy Casa Italia/EC Aste /Example 5"
```

Multi-lot (post EC-23b) — **required** or extract fails with `lotto_selection_required`:

```bash
EVAL_LIVE=1 ... pnpm --filter @easycasa/api run aste:eval "/path/to/Example 2" --lotto 4
EVAL_LIVE=1 ... pnpm --filter @easycasa/api run aste:eval "/path/to/Example 2" --lotto 7
EVAL_LIVE=1 ... pnpm --filter @easycasa/api run aste:eval "/path/to/Example 7" --lotto H
EVAL_LIVE=1 ... pnpm --filter @easycasa/api run aste:eval "/path/to/Example 8" --lotto A
EVAL_LIVE=1 ... pnpm --filter @easycasa/api run aste:eval "/path/to/Example 8" --lotto B
# or: EC_ASTE_EVAL_LOTTO=H EVAL_LIVE=1 pnpm --filter @easycasa/api run aste:eval ...
```

**Rate limits:** live OpenAI calls can return **429**. Backoff is implemented in `services/ai/app/services/aste_extract.py` (6 attempts, `Retry-After` / exponential). Space live golden-set runs; do not fire the full suite back-to-back without pause. A **~90s cooldown between cases** is recommended to reduce 429 churn and give the AI service time to finish chunked merges.

**AI service lifecycle:** the FastAPI AI process must run in the **same long-lived shell session** as the eval suite. Background AI shells started in a separate terminal are often reaped mid-run, which aborts the suite with `AI_DOWN` (exit 2). Start AI once before the first case and leave it running through GT-8; if it dies, restart AI in that same shell before continuing.

**Large dossiers:** when extract exceeds `MAX_EXTRACT_USER_CHARS` (90_000), the AI service uses chunked map-reduce. Expect `meta.warnings` entry `extract_chunked:N` (N = chunk count) on the analysis row — not a failure by itself.

Script source: `apps/api/src/aste/aste-eval.ts` · package script: `aste:eval` (compiled dist path above).

### Pass bar

- All economics figures correct with correct **page refs**: `prezzo_base`, `offerta_minima`, `cauzione`, `valore_stima`
- **Occupazione** correct on all cases in the set
- **Lotto H** not marked non-conform
- **Ex2 / GT-2**: `prezzo_base` = **avviso** values (€36.039 / €64.906), not ordinanza
- **Zero invented values** — misses land in `meta.not_found`

Near-misses → paste the table anyway; they shape EC-27 / hardening, they do not automatically kill the gate if you call a conscious fail → hardening-first path.

### Hit/miss paste template (one block per GT run)

```
## GT-x / Example N / lotto <label or unico>
analysisId: …
status: ready|failed
failureReason: …

field                     hit/miss   value          page   notes
economics.valore_stima
economics.prezzo_base
economics.offerta_minima
economics.cauzione
occupazione
conformita / non-conform
invented_values            0/n       (list any)
```

The live `aste:eval` scorer prints a TSV table (`field`, `hit`, `value`, `page`, `notes`) with nested money values unwrapped (no `[object Object]`). Compare that output to Drive GT manually.

---

## 2. Counsel packet (G1 = sent, not answered)

Bundle LGL-1 with the main GDPR packet and **email counsel**. Done when it is in counsel’s inbox with a **requested response date**.

### Attach from repo (`docs/legal/counsel-send-checklist.md`)

Core package rows 1–8, including:

8. **LGL-1** — `docs/legal/aste-counsel-addendum-lgl1.md` (Q-A1–Q-A6)

Plus Priority A items you already planned for the main GDPR send (informativa draft, consent copy, data inventory / COUNSEL-REVIEW-PACKAGE, DPO / Art. 37 question in the instruction letter).

Do **not** attach `.env`, tokens, or DB dumps.

### Email stub

```
To: <counsel>
Subject: EasyCasa — counsel review packet (GDPR + LGL-1 Dossier Asta)
Requested response by: <DATE>

Attached: instruction letter, COUNSEL-REVIEW-PACKAGE, privacy + mediation drafts,
EC-S T02/T04/T05 as applicable, and LGL-1 Aste addendum (Q-A1–Q-A6).

G1 only needs confirmation of receipt + your review timeline.
Answers unlock G2 / enable checklist — not this gate.
```

Paste back: `packet sent <YYYY-MM-DD>`.

---

## 3. Waitlist read

UI: https://admin.easycasaita.com/#aste → **Waitlist** tab (counts only).  
API (admin JWT): `GET /admin/aste/waitlist/stats` — aggregates only, no emails.  
Table: `aste_leads`.

Suggested threshold (historical): **100** total, **≥20** in one province.  
Landing runway has been short — **conscious waive** is allowed; note the reason.

### Snapshot (prod DB, cloud assist — 2026-08-11)

| Metric | Value |
| --- | --- |
| Total | **1** |
| Language | it: 1 |
| Province | MI: 1 |

**Call: WAIVED** — far below 100 / ≥20-in-one-province; `/aste` lead magnet live but runway too short for volume gate. Re-check before G2 / public enable if product still wants a volume signal.

---

## 4. Calling G1 (paste to R&D)

One message with:

1. Eval hit/miss table(s) for the minimum set (or fail table → hardening brief first)
2. `packet sent <date>`
3. Waitlist totals + **met** or **waived &lt;reason&gt;**

Then EC-27 brief can fold eval findings same session.
