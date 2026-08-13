# EC-S Claims 7–8 — completion R&D feedback (for Claude)

**As of** VPS enablement 2026-08-13 + docs on branch `cursor/ecs-claims-7-8-flags-6d4e`. Claims 7–8 signed (AZM product-owner authorisation). Boost + partner directory flags **on**. Premium still **off**. Monetised partner variants still **HOLD** (G3 row 9).

## Merge + deploy

| Step | Result |
|------|--------|
| Sign-off + packet | `docs/legal/ec-s-t02-claims-7-8-addendum.md` signed; `docs/audits/EC-S-claims-7-8-signoff-enablement.md` |
| VPS `.env` | `LISTING_BOOST_ENABLED=true` · `PARTNER_DIRECTORY_ENABLED=true` · `SELLER_PREMIUM_ENABLED=false` |
| API | Recreated with **both** `infra/docker-compose.yml` **and** `infra/docker-compose.traefik.yml` |

## What landed

| Item | Result |
|------|--------|
| Claim 7 | IT master `In evidenza` (+ aria / directoryNote) approved → boost flag on |
| Claim 8 | IT master `Elenco informativo — nessuna commissione` approved → directory flag on |
| Extra endorsement disclaimer | Not required for v1 (lead already non-intermediation) |
| G3 row 9 monetised partners | Still HOLD |
| Premium / Stripe Prices | Untouched |

## Post-deploy smoke (2026-08-13)

| Check | Result |
|-------|--------|
| `/api/health` | 200 ok |
| Container env | boost `true`, directory `true`, premium `false` |
| `/api/partners/directory` | **200** + `labelKey` (was `"partner directory not available"` 404) |
| `/it/partner-directory` | Label + title rendered |
| `POST /api/featured/checkout` (no auth) | **401** bearer (not flag-404 string) |
| `/api/seller/me` | Still **401** (G1 surfaces intact) |

## Infra lesson (critical)

`docker compose -f infra/docker-compose.yml ... up -d --force-recreate api` **without** `-f infra/docker-compose.traefik.yml` drops Traefik labels/networks → public `https://easycasaita.com/api/*` returns Traefik `"404 page not found"` while the container is healthy on `:4000`. Always recreate via `deploy.sh` COMPOSE pair or both `-f` files.

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE
- Signed Claims 7–8 addendum (AZM product-owner pattern, same as G1).
- Flipped only `LISTING_BOOST_ENABLED` + `PARTNER_DIRECTORY_ENABLED`.
- Did **not** flip premium, VO/checklist/analytics, CDN, or ledger Claim 1–2 `live`.

### 2. WHERE THE BRIEF FAILED YOU
- Ambiguous: “counsel” without external firm — recorded as AZM authorisation (consistent with G1).
- Missing: no instruction on ranking-methodology footer page — deferred, not blocking.
- Wrong: none about stack; remainings already named the two flags correctly.

### 3. REPO REALITY CHECK
- Stack: pnpm monorepo; Nest API flags are **runtime** env (no web rebuild for these two).
- Partner page is SSR → becomes live when API stops 404ing; label is i18n already shipped.
- Boost checkout is auth-gated; unauthenticated probe cannot prove “flag-off 404” vs “auth 401” — use directory endpoint + `printenv` for ops smoke.
- VPS edge: Traefik overlay **must** be included on recreate (`deploy.sh` does this).

### 4. EFFORT SIGNAL
- Smaller than a full eng feature: docs + ops flag flip. Risk was ops (Traefik recreate), not code.

### 5. BLOCKED / NEEDS A HUMAN
- Stripe Price IDs before `SELLER_PREMIUM_ENABLED`.
- External counsel may still amend labels later.
- G3 row 9 before paid partner directory variants.
- Optional Claim 1–2 ledger `live` flip still separate.

### 6. NEXT TASK SHOULD ACCOUNT FOR
- Prefer “recreate api via deploy COMPOSE (yml + traefik.yml)” in ops briefs.
- Do not bundle premium flip with Claims 7–8.
- Directory can go live empty (`items:[]`) — seed/admin content is a separate ops task if product wants populated provinces.
