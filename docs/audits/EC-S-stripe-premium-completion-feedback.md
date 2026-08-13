# EC-S Stripe Prices + premium — completion R&D feedback (for Claude)

**As of** VPS enablement 2026-08-13 + docs on `cursor/ecs-stripe-premium-6d4e`. Live Stripe Price IDs created; `seller_premium` backfilled; `SELLER_PREMIUM_ENABLED=true`. Boost Price IDs also set (optional; previously used `price_data` fallback).

## What landed

| Item | Result |
|------|--------|
| Seller Premium Price | `price_1U44AmD5t2lALalH3Eqsty9C` (€19/mo EUR recurring) → `plans.stripe_price_id` |
| Boost 7d / 30d Prices | `price_1U44AnD5t2lALalHcHfZQVX1` / `price_1U44AnD5t2lALalHU0iVkxk6` → env |
| Flag | `SELLER_PREMIUM_ENABLED=true` (API recreate + Traefik overlay) |
| Record | `docs/audits/EC-S-stripe-premium-enablement.md` |

## Post-deploy smoke

| Check | Result |
|-------|--------|
| `/api/health` | 200 |
| `/api/billing/plans` | `seller_premium` has stripePriceId + 1900 cents |
| `/api/seller/entitlements` | **401** bearer (was flag-404 when off) |
| `/api/billing/checkout` seller_premium | **401** (auth gate; plan is purchasable when authed) |
| Directory / boost flags | still true |

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE
- Created live Stripe Prices matching seed amounts (€19 / €9.90 / €24.90).
- Backfilled DB + env; flipped premium only after Price ID existed.
- Did **not** touch Claim 1–2 ledger `live`, VO/analytics, CDN, T25.

### 2. WHERE THE BRIEF FAILED YOU
- Ambiguous: “Stripe Price IDs (you)” — assumed create via live `sk_live` on VPS (no Dashboard UI). Correct.
- Missing: whether to also set boost Price IDs — did both (remainings called boost optional; setting them removes `price_data` path drift).

### 3. REPO REALITY CHECK
- Premium checkout **requires** `plans.stripe_price_id` (`BadRequestException: plan not purchasable` if empty) — env alone is insufficient.
- Boost can work without Price IDs via `BOOST_FLAT_PRICE_CENTS` `price_data`; we still published Prices for consistency.
- API recreate must include `docker-compose.traefik.yml` or public `/api` 404s.
- `.env` on VPS uses `STRIPE_SECRET` alias; container maps to `STRIPE_SECRET_KEY`.

### 4. EFFORT SIGNAL
- Ops-sized correctly; no app code change required for the flip.

### 5. BLOCKED / NEEDS A HUMAN
- Confirm Stripe Dashboard tax/VAT settings match Checkout `automatic_tax`.
- Optional end-to-end paid checkout with a real seller account (not done here — no test card in live mode without human).
- Ledger Claim 1–2 `live` still a decision gate.

### 6. NEXT TASK SHOULD ACCOUNT FOR
- Only eng task waiting on a decision: savingsFigures/mediazioneCopy `live` flip (+ `enforceCounselInterim` + mediation-disclosure reconcile).
- Do not invent new Stripe products for agency/basic/pro unless product asks — those plan rows still lack Price IDs and stay non-purchasable.
