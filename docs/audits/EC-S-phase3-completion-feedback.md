# EC-S Phase 3 — completion R&D feedback (for Claude)

**As of merge tip on `main` after PR-W + T20–T24.** Flags remain **off**. T25 HOLD. P7 ledger flip **not** done (needs T23 + G3/G4).

## Merged PRs

| PR | Task | Notes |
|----|------|-------|
| #111 | PR-W wizard → publish | Sellers `/seller/list`; agents keep `/add` |
| #112 | T20 seller inbox | Migration **0055** |
| #114 | T21/T22 viewings + capacity | Migration **0056** |
| #116 | T23 analytics | Migration **0057** |
| #115 | T24 nudges | Migration **0058**; shares `SELLER_ANALYTICS_ENABLED` |

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE
- Implemented PR-W, T20, T21/T22, T23, T24 as specified (flag-gated, shared domain modules, Nest thin).
- T25 correctly **not** started (controllership HOLD).
- No G1–G7 flag flips; no P7 ledger flip.

### 2. WHERE THE BRIEF FAILED YOU
- **Wrong:** “views/saves events exist in enrichment pipeline.” Enrichment is trust chips only; catalogue views did not exist. T23 had to add `listing_analytics_daily` + detail-path instrumentation.
- **Missing:** `zoneMedianDaysOnMarket` data source — T23 omits; T24 `LONG_ON_MARKET` stays silent without zone median.
- **Ambiguous:** open-house “auto-waitlist in requested” vs refuse 6th confirm — shipped refuse-on-confirm with i18n `capacityFull`; REQUESTED unbounded for capacity>1.
- **Path error:** authority is `packages/shared/src/authority.ts`, not `admin/authority.ts`.
- **Sandbox note was right:** do not land sandbox `package.json`/`tsconfig` into the repo.

### 3. REPO REALITY CHECK
- Stack: pnpm monorepo, Nest API, Next web, Drizzle, Vitest; shared has **no** vitest (artifact tests under `apps/api`).
- No Nest `@Cron` — use `OnModuleInit` + `setInterval` (existing scheduler pattern).
- No chart library — T23 used KPI + CSS sparkline.
- Migrations must be serialized across parallel agents (**0055–0058** claimed in dispatch order).
- Parallel agents on one checkout fight over `git checkout` — use worktrees next batch.

### 4. EFFORT SIGNAL
- T23 larger than brief implied (greenfield view store).
- T20/T24 roughly as scoped once artifacts land in shared.
- Correctly one PR per task; Phase 3 merge needed conflict resolution on flags/modules/i18n.

### 5. BLOCKED / NEEDS A HUMAN
- **G1** before any seller-facing collection / real enablement.
- **G3/G4** before P7 flip copy.
- **T05 §6.5** before T25 messaging.
- Zone median product definition for analytics/nudges.
- Ops: apply SQL **0055–0058** on VPS with this deploy.

### 6. NEXT TASK SHOULD ACCOUNT FOR
- Phase 4 (T26–T33) can start engineering-wise; Stripe T26/T27 need published listings + dashboards (now present, still flag-off).
- Mount `SellerNudgeCards` on T23 analytics page in a small follow-up once flags near enablement.
- Prefer injecting T23 analytics service into T24 job instead of fail-soft raw SQL on `listing_analytics_daily`.
- Keep counsel copy greps in CI (`check:counsel-copy`).

## Deploy smoke (post-merge)
- Flags remain `false` → seller inbox/viewings/analytics/nudges routes **404**.
- `/api/version` gitSha matches deploy tip.
- Migrations 0055–0058 applied.
- Public listing detail still 200 (view increment fail-soft).
