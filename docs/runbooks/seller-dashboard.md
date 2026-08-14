# SOP — Seller dashboard process

**Audience:** Ops / support / QA operators on EasyCasa ITA (`easycasaita.com`).  
**Scope:** End-to-end private-seller dashboard: identity → onboarding → list → publish → inbox → viewings → analytics → monetisation.  
**Not in scope:** Agency `/add` wizard, admin VO queue UI details (see admin pages), T25 in-portal messaging (parked).  
**Live state (post-roadmap):** onboarding + dual inbox **on**; boost / premium / directory **on**; VO / checklist / analytics **parked off**. Canonical open work: `docs/ec-s-post-roadmap-polish.md`.

---

## 1. Purpose

Give operators a single procedure to:

1. Provision a private seller.
2. Walk the happy path through the dashboard.
3. Diagnose flag / auth / quota failures (401 vs 404).
4. Exercise boost / premium without confusing parked surfaces.

---

## 2. Surfaces (web)

Locales: `it` (default), `en`, `es`. Paths are **not** rewritten — use `/{locale}/seller/...`.

| Route | Purpose | Web gate | API gate |
|-------|---------|----------|----------|
| `/{locale}/seller/list` | Listing wizard (create / autosave / publish) | Always | `SELLER_ONBOARDING_ENABLED` |
| `/{locale}/seller/enquiries` | Seller inbox (Richieste) | `NEXT_PUBLIC_SELLER_INBOX_ENABLED` | `SELLER_INBOX_ENABLED` |
| `/{locale}/seller/viewings` | Conducting viewings list | Always (page) | `SELLER_VIEWINGS_ENABLED` |
| `/{locale}/seller/listings/:id/availability` | Open-house / capacity slots | Always (page) | `SELLER_VIEWINGS_ENABLED` |
| `/{locale}/seller/listings/:id/analytics` | Listing analytics + nudges | Always (page) | `SELLER_ANALYTICS_ENABLED` |

**Shell:** `apps/web/app/[locale]/seller/layout.tsx` — `SellerConsentUpdate` + `SellerDashboardNav` (list · inbox · viewings). Analytics / availability are deep links only.

**Marketing entry:** `/{locale}/vendi-da-privato` (EN/ES aliases) — promise ledger Claim 1–2 live.

---

## 3. Prerequisites

### 3.1 Stack health

```bash
curl -fsS https://easycasaita.com/api/health
curl -fsS https://easycasaita.com/api/version   # confirm gitSha
```

VPS recreates **must** use the Traefik pair or public `/api` 404s:

```bash
cd /opt/easycasa-ita
docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env \
  up -d --no-deps --force-recreate api
```

### 3.2 Flag matrix (check before smoke)

| Variable | Expected live (2026-08-13+) | Notes |
|----------|------------------------------|-------|
| `SELLER_ONBOARDING_ENABLED` | `true` | Runtime API |
| `INFORMATIVA_SELLER_VERSION` | `v1.1` | No suffixes (`v1.1-seller` rejected) |
| `SELLER_INBOX_ENABLED` | `true` | Runtime API |
| `NEXT_PUBLIC_SELLER_INBOX_ENABLED` | `true` | **Build-time** web ARG |
| `LISTING_BOOST_ENABLED` | `true` | Runtime |
| `SELLER_PREMIUM_ENABLED` | `true` | Needs `plans.seller_premium.stripe_price_id` |
| `PARTNER_DIRECTORY_ENABLED` | `true` | Informational + G3 `paid_placement` |
| `SELLER_VIEWINGS_ENABLED` | **`false` (V-1 2026-08-14)** | Absent from VPS `.env` → load.ts default. Page `/seller/viewings` still 200; seller viewing APIs dark. Flip + api recreate when AZM wants journey stage 6 |
| `SELLER_ANALYTICS_ENABLED` | `false` (parked PK-3) | Do not flip without AZM |
| `VERIFIED_OWNER_ENABLED` | `false` (parked PK-1) | |
| `SELLER_CHECKLIST_ENABLED` | `false` (parked PK-2) | |
| `MEDIA_CDN_ENABLED` | `false` (parked PK-4) | |

Confirm on VPS:

```bash
grep -E '^(SELLER_|INFORMATIVA_|LISTING_BOOST|PARTNER_|VERIFIED_|MEDIA_CDN)' /opt/easycasa-ita/.env
docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env \
  exec -T api printenv SELLER_ONBOARDING_ENABLED SELLER_INBOX_ENABLED \
  NEXT_PUBLIC_SELLER_INBOX_ENABLED SELLER_PREMIUM_ENABLED LISTING_BOOST_ENABLED \
  SELLER_ANALYTICS_ENABLED VERIFIED_OWNER_ENABLED SELLER_CHECKLIST_ENABLED
```

### 3.3 Identity (Keycloak)

1. Realm: `easycasa` (`docs/runbooks/roles.md`).
2. User must hold realm role **`seller`** in the JWT (`realm_access.roles`). App DB `users.role=seller` alone is **not** enough for `@Roles('seller')` routes.
3. Assign role with `kcadm` (do **not** re-import the realm):

```bash
# After kcadm credentials against master — see roles.md
$KC add-roles -r easycasa --uusername "$SELLER_USERNAME" --rolename seller
```

4. Seller signs in via site OIDC (auth.easycasaita.com).

---

## 4. Process — happy path

### Step A — Onboarding + informativa

**Gap:** there is **no dedicated web onboarding form**. Onboarding is `POST /api/seller/onboarding`. The wizard surfaces `onboardingRequired` when the API returns 404 (flag off) or onboarding incomplete.

**Operator path (API):**

1. Obtain a bearer token for the seller (browser DevTools → Authorization after login, or Keycloak token endpoint).
2. Confirm informativa version:

```bash
curl -fsS -H "Authorization: Bearer $TOKEN" \
  https://easycasaita.com/api/seller/informativa
```

3. Complete onboarding:

```bash
curl -fsS -X POST -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"displayName":"Test Seller","phone":"+390000000000","marketingConsent":false}' \
  https://easycasaita.com/api/seller/onboarding
```

4. Verify profile + consent:

```bash
curl -fsS -H "Authorization: Bearer $TOKEN" https://easycasaita.com/api/seller/me
# expect profile + consent.decision = ok | notice (not reacceptance_required)
```

**Consent bump (T30):** if informativa major version rises, shell shows interstitial; seller must `POST /seller/informativa/accept`. “Later” only hides UI for the session — APIs stay blocked until accept.

### Step B — Create & publish listing

1. Open `https://easycasaita.com/it/seller/list` (signed in).
2. Complete wizard steps (autosave → `/listing-drafts`).
3. Publish / submit — creates listing and publish path.
4. Confirm public slug loads: `https://easycasaita.com/it/listings/<slug>`.

**Quota:** active listing / daily upload caps → **429** with `errors.quota.*` + `retryAfterSeconds`. Defaults: `SELLER_MAX_ACTIVE_LISTINGS=5`, `SELLER_MAX_UPLOADS_PER_DAY=20` (premium can raise when flag on).

### Step C — Inbox (enquiries)

1. As a **buyer** (separate account), open the listing → contact / enquiry form (privacy + mediation disclosure consents).
2. As seller, open `https://easycasaita.com/it/seller/enquiries`.
3. Expect heading **Richieste**, list of enquiries; Verified Buyer / B4A badge filters when present.
4. Mark read via UI (API: `PATCH /seller/enquiries/:id/read`).

**Dual-flag check:** if page is dark 404 but API returns 401 unauth → web build missing `NEXT_PUBLIC_SELLER_INBOX_ENABLED`. Rebuild web with Docker ARG (see §7).

### Step D — Viewings

1. Set availability: `/{locale}/seller/listings/<id>/availability`.
2. Buyer books a viewing (public listing flow).
3. Seller opens `/{locale}/seller/viewings` — confirm / cancel / complete / no-show / reschedule as needed.

If API flag off: page may still render while API calls **404**.

### Step E — Analytics + nudges (only if unparked)

When `SELLER_ANALYTICS_ENABLED=true`:

1. Open `/{locale}/seller/listings/<id>/analytics`.
2. Confirm windowed metrics + nudge cards; dismiss via UI.

**Do not enable** without AZM (PK-3).

### Step F — Monetisation

| Action | How |
|--------|-----|
| **Boost (T26)** | `POST /api/featured/checkout` `{ "listingId", "days": 7 \| 30 }` → Stripe Checkout URL. Label **In evidenza** on list/detail when active. |
| **Premium (T27)** | `POST /api/billing/checkout` `{ "planKey": "seller_premium" }` → subscription Checkout. Entitlements: `GET /api/seller/entitlements`. |
| **Portal** | `POST /api/billing/portal` → Stripe Customer Portal. |

Unauthenticated probes: **401** (not flag-404) when flags are on.

### Step G — VO / checklist (parked)

API exists (`/seller/vo/*`, `/seller/checklist/*`) but flags are **off** → **404**. No dedicated seller web UI yet. Admin moderation: `/admin` VO queue when VO is on. **Do not flip** without AZM (PK-1 / PK-2).

---

## 5. Diagnosis cheat sheet

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Seller API **404** `"… not available"` | Feature flag off | Confirm `.env` + recreate **api** (Traefik pair) |
| Seller API **401** missing bearer | Flag on, no/invalid token | Sign in; check JWT has `seller` |
| `/seller/enquiries` dark **404** | Web public flag not baked | Rebuild web with `NEXT_PUBLIC_SELLER_INBOX_ENABLED=true` ARG |
| Wizard `onboardingRequired` | Onboarding incomplete or flag off | Step A; or enable onboarding flag |
| Consent interstitial loops | Version mismatch / re-accept required | `POST /seller/informativa/accept` with current version |
| **429** on submit/upload | Quota floor | Unpublish old listings; wait window; or premium entitlements |
| Public `/api/*` Traefik **404 page not found** | Recreate without traefik.yml | Recreate with both compose files |
| Boost purchase 404 | `LISTING_BOOST_ENABLED=false` | Flip + recreate api (active boosts still show if any) |
| Premium checkout “plan not purchasable” | Missing `plans.stripe_price_id` | Backfill Price ID (see stripe-premium enablement audit) |
| Analytics page empty / errors | `SELLER_ANALYTICS_ENABLED=false` | Expected while parked |

**Rule of thumb:** unauth + flag **on** → **401**; flag **off** → **404**.

---

## 6. Operator smoke checklist (copy/paste)

- [ ] `/api/health` 200; `/api/version` SHA matches intended tip
- [ ] Seller JWT includes realm role `seller`
- [ ] `GET /api/seller/me` → **401** without token; **200** with token + `consent.decision` ok/notice
- [ ] `/it/seller/list` loads wizard
- [ ] Publish listing → public slug 200
- [ ] Buyer enquiry → `/it/seller/enquiries` shows Richieste
- [ ] Viewings list reachable; availability editable when viewings flag on
- [ ] `POST /api/featured/checkout` (auth) returns Stripe URL when boost on
- [ ] `GET /api/seller/entitlements` (auth) 200 when premium on
- [ ] Parked flags still false unless AZM unparked: VO, checklist, analytics, CDN
- [ ] Sell-privately no-script HTML still shows Claim 1 EUR + portal copy (regression)

---

## 7. Dual public-flag rebuild (inbox lesson)

Runtime `.env` alone does **not** light Next `NEXT_PUBLIC_*` routes.

```bash
cd /opt/easycasa-ita
# Ensure .env has NEXT_PUBLIC_SELLER_INBOX_ENABLED=true
# Compose must pass build.args (infra/docker-compose.yml)
docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env \
  build --no-cache web
docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env \
  up -d --no-deps --force-recreate web
```

Any **new** `NEXT_PUBLIC_*` seller flag must add Dockerfile ARG/ENV **and** compose `web.build.args` in the **same** PR (`docs/ec-s-post-roadmap-polish.md` §C.2).

---

## 8. Rollback

| Goal | Action |
|------|--------|
| Hide inbox UI | Set `NEXT_PUBLIC_SELLER_INBOX_ENABLED=false` → rebuild web |
| Disable inbox API | `SELLER_INBOX_ENABLED=false` → recreate api |
| Disable all seller collection | `SELLER_ONBOARDING_ENABLED=false` → recreate api (routes 404) |
| Stop new boosts | `LISTING_BOOST_ENABLED=false` (existing boosts still labelled) |
| Stop premium purchases / raises | `SELLER_PREMIUM_ENABLED=false` |

Do **not** flip parked PK flags “to try” — each needs an AZM decision.

---

## 9. Related references

| Doc | Why |
|-----|-----|
| `docs/ec-s-post-roadmap-polish.md` | PP/PK backlog + standing brief rules |
| `docs/env.md` | Flag semantics |
| `docs/runbooks/roles.md` | Keycloak `seller` role sync |
| `docs/sell-privately.md` | Marketing page + ledger |
| `docs/audits/EC-S-g1-signoff-enablement.md` | Onboarding + dual inbox enablement |
| `docs/audits/EC-S-stripe-premium-enablement.md` | Premium Price IDs |
| `docs/audits/EC-S-claims-7-8-signoff-enablement.md` | Boost + directory labels |
| `docs/legal/mediation-disclosure.md` | Enquiry portal disclosure |
| `docs/billing.md` | Stripe checkout / webhooks |

---

## 10. Known gaps (do not file as regressions)

1. No first-class **web onboarding** UI — API onboarding required for new sellers (**PP-4**).
2. No seller web UI for VO submit / checklist / boost buy button / premium upsell (API + billing helpers only) — **PP-5** / **PP-6**.
3. Viewings / analytics **pages** can render while APIs are flag-dark (**V-1:** viewings off as of 2026-08-14).
4. T25 messaging **HOLD** (PK-5) — inbox is enquiry list, not chat threads.
5. Empty partner directory paid catalogue → informational banner is **correct** (PK-8).

**Journey plan:** `docs/ec-s-seller-journey-completion.md`.

---
*Owner: Ops + Eng. Update when seller flags unpark or onboarding UI ships.*
