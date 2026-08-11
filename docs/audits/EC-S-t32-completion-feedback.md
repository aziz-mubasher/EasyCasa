# EC-S-T32 — completion R&D feedback (for Claude)

**As of merge tip `86a7b89` on `main` after PR #129 (T32 consolidation).** Flags remain **off**. T33 HOLD until G7 (`NEXT_PUBLIC_DEMO_MODE` unset on VPS — still `true` at deploy time). No G-gate or monetisation flag flips. No new SQL migrations. VPS `/api/version` matches tip; api+web rebuilt.

## Merged PR

| PR | Task | Notes |
|----|------|-------|
| #129 | T32 consolidation | Consent UI (T30 gap) + T33 HOLD artifact + T02 Claims 7–8 addendum + flag-matrix / Stripe DI / eslint hygiene |

## What landed

1. **T30 consent UI** — `consentUpdate` IT/EN/ES (exact brief strings); `SellerConsentUpdate` on new `app/[locale]/seller/layout.tsx`. Banner for `notice`; interstitial for `reacceptance_required` / `invalid`. Accept via `POST /seller/informativa/accept`.
2. **T33 HOLD artifact** — `@easycasa/shared` `structured-data/` builders + `serializeJsonLd` injection tests under `apps/api/src/seo/`. **Not** wired into Next `StructuredData.tsx` / sitemap / hreflang. See `docs/audits/EC-S-t33-hold.md`.
3. **T02 Claims 7–8** — `docs/legal/ec-s-t02-claims-7-8-addendum.md` linked from main counsel packet.
4. **Hygiene** — Phase 4 flag defaults-off vitest; StripeService webhook test DI after T26+T27 merge; eslint ignores `.worktrees/`.

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE
- Consent copy landed exactly as provided under `consentUpdate`.
- T33 builders + tests pre-staged; Next wiring correctly **skipped** (G7 unmet).
- Claims 7–8 filed as counsel template; no label/flag flips.
- Consolidation scoped to post-Phase-4 merge gaps (DI drift, lint worktrees, flag matrix).

### 2. WHERE THE BRIEF FAILED YOU
- **Thin T32 brief:** only “item 11” strings + HOLD artifact + counsel addendum — no full consolidation checklist. Agent filled from Phase 4 feedback (consent UI gap, flag matrix, merge hygiene).
- **Ambiguous “Not now”:** session-dismissible interstitial; API `SellerConsentGuard` still blocks selling tools. Confirm if a sticky reminder after “Later” is required.
- **Pre-existing JsonLd debt:** `apps/web/src/components/StructuredData.tsx` still escapes only `<` — T33 must replace with `serializeJsonLd` (called out in HOLD doc, untouched here).

### 3. REPO REALITY CHECK
- Stack: pnpm monorepo, Nest API, Next web, Drizzle, Vitest; shared has **no** vitest — shared-domain tests live under `apps/api`.
- Seller routes had **no** layout — T32 added one for consent shell.
- Link import is `@/i18n/routing` (not `@/i18n/navigation`).
- Privacy informativa link used: `/legal/privacy`.
- `gh` cannot merge (read-only token) — local merge → push `main`.
- VPS: `/opt/easycasa-ita`, Traefik compose; web rebuild required for consent UI; no new migrations this PR.

### 4. EFFORT SIGNAL
- Smaller than a full SEO harden (T33). Correctly one consolidation PR after feature merge.
- Largest non-product cost: Stripe test constructor arity drift from merging T26+T27 without rebasing.

### 5. BLOCKED / NEEDS A HUMAN
- **G7 / ops:** unset `NEXT_PUBLIC_DEMO_MODE` on VPS + rebuild web before dispatching T33 wiring.
- **G1** before treating consent interstitial as live product enablement.
- **Counsel:** Claims 7–8 label approvals before `LISTING_BOOST_ENABLED` / `PARTNER_DIRECTORY_ENABLED` flips.
- Stripe Price IDs still optional/empty for boost; premium plan seed exists but flag off.

### 6. NEXT TASK SHOULD ACCOUNT FOR
- **T33 dispatch** (only after G7): swap `StructuredData.tsx` → `serializeJsonLd`; CI grep forbidding raw `JSON.stringify` next to `application/ld+json`; verify ES sell-privately slug from rewrites map; sitemap lastmod = listing `updated_at`; FAQ/Service from G4-approved i18n only.
- Rebase Stripe-touching PRs onto each other before merge.
- Keep `.worktrees/` out of eslint; prefer worktrees for parallel agents.

## Deploy smoke (post-merge)
- `/api/version` gitSha matches deploy tip (web image must include seller layout).
- Flags remain `false` → premium / boost checkout / partner directory still **404**.
- No new migrations to apply.
- Consent UI inert unless `SELLER_ONBOARDING_ENABLED` + authenticated seller with profile + version mismatch (env `INFORMATIVA_SELLER_VERSION`).
- T33 JSON-LD builders **not** emitted on public pages yet.
