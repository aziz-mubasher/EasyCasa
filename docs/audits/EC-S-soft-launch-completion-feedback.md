# EC-S soft-launch closure — R&D feedback for Claude

**Date:** 2026-08-11  
**Scope:** Pre-Phase-3 engineering close — PR-C (T13 publish), PR-A (T19.1 hard 429 quota), PR-B (trust-chip i18n).  
**Merged to `main` tip:** `bee87ea` (B) atop `1f32340` (A) atop `fe6a3cf` (C).  
**T19.2:** still **HOLD** (LIA) — not started.

Companion: Phase 2 completion [`EC-S-phase2-completion-feedback.md`](./EC-S-phase2-completion-feedback.md). Specs: `docs/ec-s-phase1.md`, `docs/ec-s-phase2.md`, roadmap `docs/ec-s-roadmap.md`.

---

## 1. BRIEF ADHERENCE

| Slice | Outcome |
|-------|---------|
| **PR-C T13** | `publishLifecycle` in `@easycasa/shared`; migration **`0054`** (`first_published_at`, `unpublished_at`, `unpublished` status + immutability trigger); `POST /listings/:id/unpublish` + flag-gated `POST /seller/listings/:id/{publish,unpublish}`; Meili remove on unpublish; `daysOnMarket` from sticky first publish + `showDaysOnMarket`. |
| **PR-A T19.1** | `uploadQuota` in shared (Rome day + DST tests); Nest 429 on media upload/confirm/presign + listing create; `Retry-After` via exception filter; codes `errors.quota.*`; soft-parse `SELLER_MAX_*`; admins exempt. **No Redis** — DB count by `owner_user_id` + shared day-key filter. |
| **PR-B** | `trustChips` IT/EN/ES with ICU plurals; `ListingCard` + aria; three-locale tests. |
| **T19.2** | Not started (HOLD). |

Dispatch order followed: C → A ∥ B. No P3/P6 ledger flips. Counsel-gated flags remain **off**.

---

## 2. WHERE THE BRIEF FAILED YOU / DEVIATIONS

1. **Migration id:** Tip before land was **0053** → used **0054** (verified `ls`, not assumed).
2. **Backfill equality:** No publish-event history table; `first_published_at = published_at` documented in SQL. Native `publish()` previously overwrote `published_at` — equality is best reconstruction.
3. **Status enum:** Added `unpublished` rather than mapping unpublish → `draft`.
4. **Agent vs seller routes:** Kept `POST /listings/:id/publish` for agents; seller routes behind `SELLER_ONBOARDING_ENABLED`.
5. **Redis skipped:** Upload volume does not justify Redis yet; SQL `AT TIME ZONE 'Europe/Rome'` + in-memory `localDayKey` filter.
6. **Listing quota:** Counts **published** listings on **create** (6th create with 5 published → 429).
7. **Wizard `/add` → publish:** Not rewired (non-trivial); noted, not scope-crept.
8. **Merge conflict:** A vs C on `listings.module.ts` + shared barrel — resolved by union (SellerQuotaModule + SellerListingsController).

---

## 3. REPO REALITY CHECK

- Stack unchanged: pnpm monorepo; Next 14 + next-intl; Nest + pg; Docker Compose + Traefik on Hostinger `/opt/easycasa-ita`.
- Shared domain TS belongs in `@easycasa/shared`; Nest stays thin (same pattern as VO FSM).
- Inject `DRIZZLE` (not a `DB` token). Exception filter historically dropped sibling fields — now forwards `code` + `Retry-After`.
- Messages: `apps/web/messages/{it,en,es}.json` — do not invent a separate trustChips file on disk.
- Vitest: never `import it from '….json'` (shadows vitest `it`).
- Next migration id: **`ls migration/sql \| tail` → after this tip expect 0054**.

---

## 4. EFFORT SIGNAL

- Correctly three PRs. C was the largest (schema + service rewrite). A medium. B small.
- Stacking B on C avoided `showDaysOnMarket` drift; A independent of C but conflicted on module wiring at merge.

---

## 5. BLOCKED / NEEDS A HUMAN

| Item | Owner |
|------|--------|
| T05 Layer 1 + §6.3 → flag flips | Counsel / DPO |
| T04 row 7; T02 Claims 4–5 | Counsel |
| Bunny DPA; unset `NEXT_PUBLIC_DEMO_MODE` | Ops / product |
| **T19.2** after LIA signs | Counsel → same-day dispatch |
| Confirm VPS `0054` + `/api/version` = tip | Ops (this deploy) |

---

## 6. NEXT TASK SHOULD ACCOUNT FOR

1. Soft-launch engineering is **closed**; remaining gates are human.
2. T19.2 brief already authored — wait for LIA; depends on PR-C unpublish path for suspend UX.
3. Do not flip `SELLER_ONBOARDING_ENABLED` / VO / checklist / CDN / dup-enforce without counsel.
4. After flag flip: smoke publish→unpublish→relist (first_published_at sticky); 21st Rome-day upload → 429; trust chips in IT/EN/ES.
5. ES trust strings unreviewed — one file if a human pass ever happens.
6. DST tests pin **2026** EU transition dates (Mar 29 / Oct 25) — note for 2027 refresh.

---

## 7. DEPLOY NOTES (ops) — target this tip

1. `git pull --ff-only origin main` → tip with A/B/C (`bee87ea` or later feedback commit).
2. Apply `migration/sql/0054_ecs_t13_publish_lifecycle.sql` via compose `db` + `psql`.
3. Env already has `SELLER_MAX_*` (defaults); no new vars. Quota is **always on** (not flag-gated).
4. Rebuild **api** + **web** (+ **admin** if desired) with `GIT_SHA` / `BUILD_TIME`.
5. Smoke: `/api/version`; site 200; seller VO/checklist still **404** while flags off; private docs still authZ’d.

---

## 8. PR / SHA MAP

| PR | Branch | Merge |
|----|--------|-------|
| #108 | `cursor/ecs-t13-publish-lifecycle-6d4e` | `fe6a3cf` on main |
| #110 | `cursor/ecs-t19-quota-429-6d4e` | `1f32340` merge commit |
| #109 | `cursor/ecs-t17-trust-chips-i18n-6d4e` | `bee87ea` merge commit |

---

*End of soft-launch closure feedback. Feed into next Claude brief only after human gates or LIA for T19.2.*
