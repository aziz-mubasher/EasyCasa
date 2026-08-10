# EC-S Phase 2 completion — R&D feedback for Claude

**Date:** 2026-08-10  
**Scope:** Private Seller Track Phase 2 (T14.0 → T19 stage 1) merged to `main` and deployed to VPS with counsel-gated flags **off**.  
**Phase 2 code merge:** `ebafa63` (T18/T17/T19.1 tip).  
**Feedback on `main`:** `42c921c` (docs-only; VPS tree pulled).  
**API image at verify:** `cc2f230` (aste admin landed on `main` after Phase 2; still contains Phase 2).

Companion pre-brief (what Claude needed before writing Phase 2): [`EC-S-phase2-feedback.md`](./EC-S-phase2-feedback.md). Spec: [`docs/ec-s-phase2.md`](../ec-s-phase2.md). Roadmap: [`docs/ec-s-roadmap.md`](../ec-s-roadmap.md).

---

## 1. BRIEF ADHERENCE

### Implemented as specified

| Slice | Outcome |
|-------|---------|
| **T14.0** | Master-key gate: public `media/{aa}/{sha}.webp` + legacy `listings/` readable without auth; `users/{id}/docs/...` requires owner or admin. Unit tests in `media-file-access.spec.ts`. |
| **T14** | Verified Owner FSM in `@easycasa/shared` (`voStateMachine`), Nest module `/seller/vo/*`, MinIO under `users/{id}/docs/vo/`, expire sweep, DSAR `verified_owner` source. Flag **`VERIFIED_OWNER_ENABLED=false`**. |
| **T15** | Capability `vo_moderation` (ops/superadmin only — **not** AML). Admin queue/claim/verify/reject + audit. Admin UI `VoModeration`. |
| **T16** | `ownerNameMatch` in shared (NFD strip + token Jaccard); wired into VO verify path; docs + unit tests. |
| **T18** | `seller_doc_checklist` table + `/seller/checklist/*`. Flag **`SELLER_CHECKLIST_ENABLED=false`**. Explicitly **not** fascicolo. |
| **T17** | `ListingSummary.trust` enrichment on search/list/detail; chips on `ListingCard` (Verified Owner / In vendita da X giorni / Docs verified). |
| **T19.1** | Dup hits set `media.moderation_flag`; admin `/admin/abuse/flagged-media` + `repeat-offenders`; env knobs `SELLER_MAX_ACTIVE_LISTINGS` / `SELLER_MAX_UPLOADS_PER_DAY` documented (defaults 5 / 20). |

Migrations: **`0052_ecs_phase2_verified_owner.sql`**, **`0053_ecs_phase2_seller_checklist.sql`** (after existing `0050`/`0051` from other work).

Dispatch order followed: T14.0 → T14 (flag off) → T15 ∥ T16 → T18 → T17 → T19.1. No P3/P6 flips.

### Deviations (and why)

1. **Migration numbers:** Brief assumed `0048`/`0049` after Phase 1. Repo already had `0050`/`0051` (unrelated). Used **`0052`/`0053`**.
2. **Pre-brief filename:** Claude asked for `EC-S-phase2-prebrief.md`; existing file is `EC-S-phase2-feedback.md` — kept that name and linked from roadmap.
3. **T19 rate limits:** Env knobs + docs are present; **full 429 enforcement on upload** is not a complete Nest interceptor yet — soft stage-1 surface (admin visibility + flags on media). Stage 2 (LIA / suspend UI) still open.
4. **Trust chip copy:** Partially IT-hardcoded in `ListingCard` rather than full `next-intl` keys for every string — works for IT-first launch; i18n polish is follow-up.
5. **daysOnMarket:** Uses `publishedAt ?? createdAt` per T13 caveat already in pre-brief / Phase 1 feedback.

### Skipped (intentionally)

- T19 stage 2 (LIA, suspend UX, counsel memo).
- Enabling any Phase 2 flag on VPS.
- Fascicolo / KYC / identity-doc overload / P3–P6.

---

## 2. WHERE THE BRIEF FAILED YOU

### Ambiguous

- **“Rate limiting soft”** — interpreted as env + admin visibility + moderation_flag, not hard 429 on every upload path. Say explicitly if Nest must reject uploads with 429 in stage 1.
- **Trust chip i18n** — brief said chips on cards; did not require full locale files. Assumed IT-first strings OK.

### Missing

- Exact admin nav IA for VoModeration / abuse pages (placed under existing admin routes).
- Whether checklist “complete” should auto-set any listing badge (it does not — docs_verified comes from VO verify path only).

### Over-specified

- FSM / name-match TypeScript pasted in chat was useful and merged into `@easycasa/shared` with only light Nest wiring — good pattern; keep doing that for pure domain logic.

### Wrong / outdated vs repo

- Assumed next SQL ids `0048`/`0049` — wrong after `0050`/`0051` landed.
- Pre-brief path name mismatch (`prebrief` vs `feedback`).

---

## 3. REPO REALITY CHECK (Claude cannot see the repo)

### Stack (unchanged)

- pnpm monorepo; Next 14 App Router + next-intl; NestJS + pg; FastAPI AI; Vite admin; Docker Compose + Traefik on Hostinger VPS `/opt/easycasa-ita`.
- Shared package: `@easycasa/shared` — put VO FSM + name match + checklist types here, not duplicated in Nest.

### Conventions that mattered

- Feature flags default **false** in code + `.env.example` + `docs/env.md`.
- SQL migrations under `migration/sql/` with sequential `00NN_` prefixes — **always check latest file number**.
- Admin capabilities in `packages/shared/src/admin/authority.ts` — do not invent parallel RBAC.
- Media access: `apps/api/src/media/media-file.controller.ts` + pure helpers in `media-file-access.ts` — extend helpers, don’t bypass.
- Do **not** spread Nest `ConfigService` Proxy (`{...config}`) — empty `ownKeys` (T10 lesson).

### What already existed that Phase 2 reused

- Seller onboarding flag path + MinIO `users/{id}/docs/` layout (Phase 1).
- Dup-detect service + `media.phash` / moderation columns.
- Admin shell + audit logger patterns (T15 mirrored claim/verify/reject).
- Listing search enrichment pipeline (T17 hooked trust there).
- DSAR export registry (VO source registered).

### Fragile / do-not-touch without ask

- `/infra` deploy/secret handling.
- Live VPS `.env` secrets; CDN/seller/dupdetect stay **false** until counsel.
- WordPress ETL / `migration/etl`.

---

## 4. EFFORT SIGNAL

- **Larger than a single PR** — correctly split into #103 (T14.0/T14/T16), #104 (T15), #105 (T18/T17/T19.1). Total surface: shared + API modules + admin UI + web chips + 2 migrations + env docs.
- Dispatch order was right; T15 ∥ T16 parallelism worked.
- T19.1 was the thinnest slice; full abuse product is still Phase 2 incomplete by design.

---

## 5. BLOCKED / NEEDS A HUMAN

| Item | Owner |
|------|--------|
| Flip `VERIFIED_OWNER_ENABLED` / `SELLER_CHECKLIST_ENABLED` after counsel | Product + legal |
| T19 stage 2 LIA / suspend policy | Counsel |
| Full upload 429 wiring if required before soft launch | Eng after product call |
| Trust chip i18n pass (EN/IT) | Eng polish |
| Confirm VPS migrate applied `0052`/`0053` and `/api/version` matches tip | Ops (this deploy) |

---

## 6. NEXT TASK SHOULD ACCOUNT FOR

1. **Phase 3 / counsel gates** — do not enable VO or checklist without written go-ahead; P3/P6 still off.
2. **T19.2** — LIA memo, suspend UI, enforce rate limits for real if counsel wants hard caps.
3. **i18n** — move trust chip strings into next-intl.
4. **Migration numbering** — `ls migration/sql \| tail` before assigning next id (current tip after Phase 2: **0053**).
5. **Ops smoke after flag flip:** VO submit → admin claim/verify → trust chip on listing; checklist toggle with flag on; private doc URL still 401/403 for strangers.
6. Prefer shipping pure domain TS in the brief (as with VO FSM / name match) — Nest stays thin.

---

## 7. DEPLOY NOTES (ops) — done 2026-08-10

On `/opt/easycasa-ita`:

1. Pulled Phase 2 tip (`ebafa63`); later docs tip `42c921c`.
2. Applied `0052` then `0053` via  
   `docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env exec -T db psql …`  
   Tables present: `verified_owner_case`, `seller_doc_checklist`.
3. Appended to `.env` (all off / defaults):

```bash
VERIFIED_OWNER_ENABLED=false
VERIFIED_OWNER_VALIDITY_MONTHS=12
SELLER_CHECKLIST_ENABLED=false
SELLER_MAX_ACTIVE_LISTINGS=5
SELLER_MAX_UPLOADS_PER_DAY=20
```

4. Rebuilt/recreated **api**, **admin**, **web** (`--no-cache`, `GIT_SHA`/`BUILD_TIME`).
5. Smoke: site/AI **200**; `/seller/vo` + `/seller/checklist` **404** (flags off); private `users/…/docs` **401** unauthenticated; public missing media key **404**.

---

## 8. PR / SHA MAP (at merge time)

| PR | Branch | Content |
|----|--------|---------|
| #103 | `cursor/ecs-t14-verified-owner-6d4e` | T14.0 + T14 + T16 |
| #104 | `cursor/ecs-t15-vo-moderation-6d4e` | T15 |
| #105 | `cursor/ecs-t18-seller-checklist-6d4e` | T18 + T17 + T19.1 |

Tip merge commit before this feedback file: **`ebafa63`** (`feat: EC-S T18 checklist, T17 trust chips, T19.1 abuse surfaces`).

---

*End of Phase 2 completion feedback. Feed this into the next Claude brief before Phase 3 or T19.2.*
