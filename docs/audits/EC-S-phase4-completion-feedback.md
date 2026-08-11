# EC-S Phase 4 — completion R&D feedback (for Claude)

**As of merge tip on `main` after PR-1 + T30 + T27 + T26 + T28/T29 + T31.** Flags remain **off**. T32 not started (consolidation after this merge). T33 HOLD until G7 / `NEXT_PUBLIC_DEMO_MODE` unset. No G-gate or monetisation flag flips.

## Merged PRs

| PR | Task | Notes |
|----|------|-------|
| #121 | PR-1 nudge cards + T24→T23 | `SellerNudgeCards` on analytics; T24 uses analytics `sumViewsInWindowFailSoft` |
| #122 | T30 consent versions | Migration **0060**; `SellerConsentGuard` + accept endpoint + DSAR source |
| #123 | T27 premium tier | Migration **0061**; `SELLER_PREMIUM_ENABLED=false`; reuses Stripe subscription rail |
| #124 | T26 listing boost | Migration **0062**; `LISTING_BOOST_ENABLED=false`; flat 7d/30d; Meili `boostWeight` + DSA “In evidenza” |
| #125 | T28/T29 partner directory | Migration **0063**; `PARTNER_DIRECTORY_ENABLED=false`; informational only (no fees) |
| #126 | T31 seller i18n | CI `check:seller-hardcoded-strings` via `check:counsel-copy` |

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE
- Implemented PR-1, T30, T27, T26, T28/T29, T31 as specified (flag-gated, shared domain modules, Nest thin, flat-fee T04 row 8).
- T32 correctly **not** combined with feature PRs — deferred until T26+T27 are on `main` (now true; run T32 as its own follow-up).
- T33 correctly **not** started (G7 / demo-mode HOLD).
- No G1–G7 flips; monetisation flags stay `false` in `.env.example` and on VPS.

### 2. WHERE THE BRIEF FAILED YOU
- **Ambiguous / thin UI:** T30 consent versioning landed guard + ledger + DSAR, but web banner / re-accept UX is minimal — clarify if a blocking interstitial is required before enablement.
- **Over-specified rail fear (T27):** Brief implied Stripe subscription rail might need extension; repo already had subscription Checkout + webhook sync — only local `seller_subscription` upsert + entitlements were needed. Say “reuse existing rail” next time when memberships already exist.
- **Missing (T26 ↔ featured):** Legacy `featuredPlacements` + `listings.featuredUntil` coexist with new `listing_boost`. Merge kept boost as ranking/label source of truth; confirm whether old featured path should be retired or dual-written long-term.
- **Missing (T27 analytics window):** Free tier must keep **90d** analytics window (not 30) or T23 UX regresses — brief entitlements table understated this.
- **Path / CI:** Seller hardcoded-string gate belongs in root `scripts/` + `pnpm check:counsel-copy` (not only web package scripts).
- **Worktrees:** Parallel agents on one checkout still fight — Phase 4 used worktrees successfully; keep mandating that in dispatch.

### 3. REPO REALITY CHECK
- Stack: pnpm monorepo, Nest API, Next web, Drizzle, Vitest; shared domain in `@easycasa/shared` (no vitest there — specs live under `apps/api` / `apps/web`).
- Migrations claimed in dispatch order: **0060–0063** (aste already took **0059**).
- Stripe: one `StripeService` owns subscription + one-time featured/boost webhooks; DI needs `ListingBoostModule` + `SearchModule` on `BillingModule`.
- Meili ranking already had patch hooks — boost weight plugged there; DSA badge is `spotlight` / i18n `listingBoost.inEvidenza`, not a trust chip.
- Partner directory is a separate public surface + admin CRUD; capability `partner_directory`; strip tracking params on outbound links.
- CI often **UNSTABLE** on gitleaks / a11y / Lighthouse / python audit / consolidation — treat as flaky noise unless job is newly introduced by the PR; `gh` token cannot merge (use local merge → push `main`).

### 4. EFFORT SIGNAL
- T26+T27 merge conflict surface was the largest cost (flags, `load.ts`, `schema` barrel, `stripe.service`, i18n) — expected when two billing PRs land back-to-back on divergent branches.
- T27 smaller than “new billing rail” implied; T26 medium (schema + Meili + pause/resume + expire worker).
- T28/T29 about right for v1 informational directory.
- T31 correctly scoped as sweep + CI gate after surfaces exist.
- Correctly one PR per task; Phase 4 merge needed conflict resolution on flags/modules/i18n/billing.

### 5. BLOCKED / NEEDS A HUMAN
- **G1** before seller-facing collection / real enablement of consent-gated surfaces.
- **G3 row 9** before any monetised partner referral.
- **G3/G4** before P7 ledger flip copy (still open from Phase 3).
- **G7** + unset `NEXT_PUBLIC_DEMO_MODE` before T33.
- Stripe Dashboard: create/publish Price IDs for `seller_premium` + boost 7d/30d before flipping flags (or rely on Checkout `price_data` for boost only).
- Ops: apply SQL **0060–0063** on VPS with this deploy; append flags as `false`.

### 6. NEXT TASK SHOULD ACCOUNT FOR
- **T32 consolidation** now unblocked — own PR, no feature work mixed in; audit flag matrix, env docs, and cross-module imports after this merge.
- Do not start T33 until G7.
- Prefer worktrees + pre-claimed migration IDs in the dispatch note.
- When two Stripe features ship in one phase, rebase the later PR onto the earlier before review to cut merge pain (`stripe.service` / `BillingModule`).
- Consent re-accept UI product decision before turning T30 paths fully on.
- Keep `check:counsel-copy` (incl. seller hardcoded strings) green in CI.

## Deploy smoke (post-merge)
- Flags remain `false` → premium checkout / boost purchase / partner directory / entitlements routes **404** (existing active boosts would still rank if any existed — none in prod).
- `/api/version` gitSha matches deploy tip.
- Migrations **0060–0063** applied.
- Public listing detail + search still 200; no DSA “In evidenza” without active boosts.
