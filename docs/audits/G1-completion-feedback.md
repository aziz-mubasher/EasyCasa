# G1 — completion feedback (for Claude / R&D)

**Date:** 2026-08-11  
**Task:** G1 gate assist (eval path + counsel packet checklist + waitlist read)  
**PR (assist):** https://github.com/aziz-mubasher/EasyCasa/pull/127 (squash `ff43e9a`)  
**Deploy:** VPS `api` force-recreated; `/api/version` → `gitSha: ff43e9a`  
**Board:** G1 is a **product gate**, not a Kaizen build task — no new K EC id. Eval findings feed **EC-27** (or a hardening brief first if the bar fails).  
**Flags:** `ASTE_ANALYSIS_ENABLED` still **off**. G1 ≠ flag flip; G2 + `docs/runbooks/aste-enable.md` still govern public enable.

---

## 1. BRIEF ADHERENCE

**Implemented as specified (what cloud could do)**
- Documented exact Mac eval invocation, stack (`db` / `minio` / `redis` / `meilisearch` / `ai`), env (`EVAL_LIVE=1`, `ASTE_ANALYSIS_ENABLED`, `CHAT_PROVIDER=openai`, `OPENAI_API_KEY`, shared `AI_INTERNAL_TOKEN`, host-reachable `AI_URL` / `S3_ENDPOINT` / `DATABASE_URL`).
- Minimum GT set + pass bar written into `docs/runbooks/aste-g1-gate.md` (linked from `aste-enable.md`).
- Counsel path: core package row 8 = LGL-1 `docs/legal/aste-counsel-addendum-lgl1.md` + send checklist; G1 = **sent**, answers → G2.
- Waitlist read from prod `aste_leads` (not a fictional `aste_waitlist` table): **total 1 · it:1 · MI:1** → **WAIVED** with reason (short landing runway vs 100 / ≥20-in-one-province).
- Unblocked multi-lot eval post–EC-23b: `aste:eval` accepts `--lotto` / `EC_ASTE_EVAL_LOTTO` and passes `lottoLabel` on `create()`.

**Deviations**
- Could not produce the decisive eval hit/miss table — Drive PDFs + GT doc are Mac/AZM-only; cloud correctly does not run live OpenAI against real perizie.
- Did not email counsel — G1 send is AZM human action; repo only holds the packet files + stub.

**Skipped**
- Live `EVAL_LIVE=1` golden-set runs (GT-1, GT-2×2, GT-3, GT-4, GT-5/H, GT-8).
- Calling G1 green — blocked until AZM pastes eval table + `packet sent <date>` (waitlist already waived).

---

## 2. WHERE THE BRIEF FAILED YOU

| Type | Detail |
|------|--------|
| Ambiguous | User Mac one-liner omitted `EVAL_LIVE=1` and `--lotto` — without them the script is dry-run / multi-lot fails with `lotto_selection_required` after EC-23b. |
| Missing | Exact local Drive folder names beyond “Example N”; assumed `/Volumes/Muba/Easy Casa Italia/EC Aste /Example N` from prior handoff. |
| Missing | Mac git clone path — not knowable from cloud (`/workspace` only). |
| Wrong / stale | Treating waitlist as admin-only UI — aggregates also via `GET /admin/aste/waitlist/stats` and SQL on `aste_leads`. |
| Over-specified vs repo | Compose services have **no published ports** by default (internal + Traefik/Caddy). Host-side `pnpm aste:eval` needs a ports override or localhost URL remapping — documented in the runbook/script AZM was given. |
| Missing in git | `EC_Aste_GoldenSet_GroundTruth_v1.md` is Drive-only — Claude cannot cite line-level GT from the repo. |

---

## 3. REPO REALITY CHECK

- **Stack:** pnpm monorepo — Nest (`apps/api`) + FastAPI AI (`services/ai`) + Next web; Drizzle/SQL migrations; MinIO; OpenAI-compatible chat via `CHAT_PROVIDER=openai`.
- **Eval:** `pnpm --filter @easycasa/api aste:eval <dir> [--lotto <label>]` → `apps/api/src/aste/aste-eval.ts`. Live mode boots Nest `AppModule` in-process and ticks `AstePipelineService`.
- **Schema:** pipeline persists **schema_version 2** (`immobili[]`, `economics.cauzione` object, `giuridica.stato_occupazione`, `meta.lotti_trovati`). Precedence guard: avviso `prezzo_base` over ordinanza when candidates present.
- **Counsel packet on disk:** `docs/legal/counsel-send-checklist.md` (core 1–8), `COUNSEL-REVIEW-PACKAGE.md`, `aste-counsel-addendum-lgl1.md` (Q-A1–Q-A6), instruction letter.
- **Waitlist:** table `aste_leads` (migration `0046`); admin UI `admin.easycasaita.com/#aste` → Waitlist; API `GET /admin/aste/waitlist/stats` (no emails).
- **Already shipped that G1 brief may under-weight:** EC-23b lot scoping + traps; EC-28 financing referral (dark). Neither enables the flag.
- **Constraints:** no secrets in git; real perizie stay off-repo; CI on #127 had pre-existing reds (seller hardcoded-string script/`rg`, consolidation `process.env` allowlist) unrelated to this change — merged with admin.

---

## 4. EFFORT SIGNAL

Much smaller than a feature brief — correctly an **operator assist + one small eval fix**, not a build epic. Should stay one PR. The *gate itself* is still open until AZM runs eval + sends counsel.

---

## 5. BLOCKED / NEEDS A HUMAN (AZM)

1. Mac golden-set eval → paste hit/miss tables (or fail tables → hardening-first).
2. Email counsel LGL-1 + GDPR core package → reply `packet sent <YYYY-MM-DD>`.
3. Confirm waitlist **waive** (1 signup) or override.
4. Kaizen: no new task required for this assist; when eval lands, fold findings into **EC-27** brief same session (or write hardening brief first).
5. Do **not** flip `ASTE_ANALYSIS_ENABLED` on G1 alone.

---

## 6. NEXT TASK SHOULD ACCOUNT FOR

1. **EC-27 (payments)** must consume the eval table — near-misses (prezzo-base precedence, occupazione enum, lotto H non-conform trap) become hardening items, not silent assumptions.
2. If Ex2 still returns ordinanza `prezzo_base`, harden prompt + `applyPrezzoBasePrecedence` / `prezzo_base_candidates` path before monetizing.
3. If GT-8 occupancy misfires, close the occupied-keyword / `stato_occupazione` enum — do not invent values; misses → `meta.not_found`.
4. G2 still needs counsel **answers** + `docs/runbooks/aste-enable.md` checklist — G1 only needs packet **sent**.
5. Next free migration index remains **`0060`** if EC-27 needs SQL.
6. Mac operators: pull `main` (`ff43e9a+`) before eval so `--lotto` exists; use `docs/runbooks/aste-g1-gate.md` as the single checklist.
