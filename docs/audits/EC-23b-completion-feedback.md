# EC-23b — completion feedback (for Claude / R&D)

**Date:** 2026-08-11  
**PR:** https://github.com/aziz-mubasher/EasyCasa/pull/113 (squash `3b50269`)  
**Hygiene:** https://github.com/aziz-mubasher/EasyCasa/pull/117 (rename migration → `0059`)  
**Board (proposed):** K EC 1.50 · Operations · Improve  
**Deploy:** VPS `api`/`web`/`ai` Recreated; `lotto_label` present; live `/api/version` image built from tip that **includes** EC-23b (`gitSha` reported `888feed` at land — subsequent ECS docs commits on `main`; tree on VPS now `9f2f4d8`).  
**Flags:** `ASTE_ANALYSIS_ENABLED` still **off**.

---

## 1. BRIEF ADHERENCE

**Implemented as specified**
- Extraction schema **v2**: `immobili[]`, `procedura.tipo`/`numero`, `cauzione` object (no dual-write `cauzione_pct`).
- User lot intent column `lotto_label` (kept denormalized `lotto`).
- Nest lot-scope guards → force `failed` (`lotto_selection_required` / `lotto_not_found`); no auto-retry.
- `prezzo_base` avviso-over-ordinanza precedence.
- `PATCH` lottoLabel + `POST …/resubmit` (failed → uploaded, docs retained).
- Report rejects v1 with `ASTE_REPROCESS_REQUIRED`.
- AI extract/chat: `lotto_label` + v2 normalize (legacy `immobile` / `cauzione_pct` → v2).
- Web: lotto field, failed→fix→resubmit UX; report shows `immobili[]`, tipo labels, cauzione base, lotto badge, warnings.
- §5.6 synthetic trap fixtures (7 traps) + unit/AI tests.

**Deviations**
- Migration originally landed as **`0055_aste_lotto_label.sql`**; ECS concurrently used **`0055_ecs_t20_enquiry_inbox.sql`**. Follow-up PR #117 renumbered Aste file to **`0059`**. Column already applied on VPS via `IF NOT EXISTS` — no data change.
- Admin: only failure-reason **category** `lotto` in mask (no full i18n label set).

**Skipped**
- Real golden-set `aste:eval` against Drive PDFs (AZM-only; not in cloud).
- Observability stack / flag enable (out of scope; still off).

---

## 2. WHERE THE BRIEF FAILED YOU

| Type | Detail |
|------|--------|
| Ambiguous | Exact admin failure-reason copy for `lotto_*` — guessed category-only. |
| Missing | Precise IT/EN/ES procedura.tipo / cauzione base wording — chose product-sensible strings. |
| Race | Brief said “next free migration after 0054” but ECS Phase 3 agents claimed 0055–0058 in parallel. |
| Over-specified | Cauzione dual-write ban — correctly followed; consumers all had to move to object shape. |

---

## 3. REPO REALITY CHECK

- **Stack:** pnpm monorepo · NestJS API · Next.js web · FastAPI AI · Drizzle + `migration/sql/*.sql` · Compose + Traefik on VPS `/opt/easycasa-ita`.
- **Conventions:** Conventional Commits; Aste code under `apps/api/src/aste/*` and `apps/web/src/components/services/Aste*`; unit fixtures that `tsc` compiles must live under `apps/api/src` (`rootDir`), not `test/fixtures`.
- **Already existed:** full analysis/report/chat/pipeline; schema v1 consumers everywhere.
- **CI noise (pre-existing / unrelated):** gitleaks on `.env.demo.example`, pypdf audit, WhatsApp int 403s, consolidation `process.env` allowlist — core `CI/node` + `CI/ai` green for #113.
- **Deploy gotcha:** VPS disk was ~91% (60GB+ reclaimable BuildKit cache). Prune before `--no-cache` builds. Concurrent ECS/Banks4All builds on the same host can race `GIT_SHA` bake markers — verify `/api/version` **and** that EC-23b files exist in the running image.

---

## 4. EFFORT SIGNAL

Larger than a thin schema bump: every Nest consumer (semaforo, OMI, free-text, report, pipeline) + web + AI + int mocks needed v2 paths. Still correctly **one** product task; migration hygiene deserved the tiny follow-up (#117).

---

## 5. BLOCKED / NEEDS A HUMAN

- Kaizen: mark **K EC 1.50** progressed/complete and link PRs #113 / #117 (AZM board).
- Confirm ECS `0055`–`0058` applied on VPS (not part of this task).
- Do **not** enable `ASTE_ANALYSIS_ENABLED` until G1 / golden-set eval path is ready.
- Optional: rebuild once more at tip `9f2f4d8` if you want `/api/version` SHA to match git HEAD exactly (functionally EC-23b already in `888feed` image).

---

## 6. NEXT TASK SHOULD ACCOUNT FOR

1. **Next free migration index: `0060`.** Always `ls migration/sql \| sort` on latest `main` immediately before naming.
2. Parallel cloud agents **will collide** on migration numbers — serialize or reserve ranges (Aste vs ECS).
3. Pre-v2 ready analyses → `ASTE_REPROCESS_REQUIRED` / resubmit path.
4. G1 still gates **EC-27** (payments) and **EC-28** (Banks4All).
5. Real eval remains operator-only (`aste:eval` + Drive PDFs).
