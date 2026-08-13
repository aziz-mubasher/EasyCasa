# EC-S G1 — completion R&D feedback (for Claude)

**As of tip `d037d8c` on `main` + VPS enablement 2026-08-13 (re-verified).** G1 signed (AZM product-owner authorisation). Seller onboarding + dual inbox flags **on** and deployed. Savings/mediazione ledger blocks remain **fallback**. Monetisation / VO / analytics flags untouched.

## Merge + deploy

| Step | Result |
|------|--------|
| Land on `main` | Fast-forward via `git push origin HEAD:main` (no separate PR — branch == main). Tips: `1ed7324` sign-off → `d4ad149` Docker ARG fix → `87c4cbb` feedback → `d037d8c` remainings |
| VPS git | `/opt/easycasa-ita` at **`d037d8c`** |
| API | Recreated to pick up env (`INFORMATIVA_SELLER_VERSION`, onboarding, inbox). Image SHA still `fa63487` (runtime env; web-only code rebuild for public flag) |
| Web | Rebuilt `--no-cache` **twice** — first miss (flag not baked), second after Dockerfile/compose ARG fix |

## What landed

| Item | Result |
|------|--------|
| Sign-off record | `docs/audits/EC-S-g1-signoff-enablement.md` + packet boxes on T02/T04/T05 |
| `INFORMATIVA_SELLER_VERSION` | **`v1.1`** on VPS (parseable; T05 draft `v1.1-seller` renamed) |
| `SELLER_ONBOARDING_ENABLED` | **`true`** — API `/seller/me` → **401** (was flag-404) |
| `SELLER_INBOX_ENABLED` | **`true`** — API `/seller/enquiries` → **401** |
| `NEXT_PUBLIC_SELLER_INBOX_ENABLED` | **`true`** (container env + baked) — `/it/seller/enquiries` renders **Richieste** + sign-in (`data-testid` seller-inbox*) |
| Ledger `savingsFigures` / `mediazioneCopy` | Still **fallback** (intentional) |
| Claims 7–8 / boost / premium / directory | Still **false** |

## Post-deploy smoke (2026-08-13)

| Check | Result |
|-------|--------|
| `/api/health` | 200 ok |
| `/api/seller/me` (no auth) | **401** missing bearer |
| `/api/seller/enquiries` (no auth) | **401** |
| `/it/seller/enquiries` | **200**, heading Richieste, not dark 404 |
| `/it/seller/list` | **200** |
| `/it/vendi-da-privato` | Fallback “Pubblica gratis…”; Claim-1 EUR body **not** rendered |

## Infra fix required for inbox

First web rebuild left inbox dark: `NEXT_PUBLIC_SELLER_INBOX_ENABLED` was only in runtime `.env`, **not** a Docker build ARG. Next inlines `NEXT_PUBLIC_*` at build.

**Fix (`d4ad149`):** ARG/ENV in `apps/web/Dockerfile` + `infra/docker-compose.yml` `web.build.args`. Documented in `docs/env.md`.

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE
- Signed T02/T04/T05 for **G1 enablement** per AZM instruction; set informativa version; flipped onboarding + dual inbox; merged to `main` and deployed.
- Did **not** flip EUR / portal-not-agent copy to `live` (packets allow deferral; mediation-disclosure tension remains).
- Did **not** flip Claims 7–8 or monetisation flags.

### 2. WHERE THE BRIEF FAILED YOU
- **Ambiguous “sign”:** treated as product-owner authorisation to open collection surfaces, not external counsel firm stamp. Documented plainly in `EC-S-g1-signoff-enablement.md`.
- **Missing:** Dockerfile bake for `NEXT_PUBLIC_SELLER_INBOX_ENABLED` — T20 brief taught the dual-flag pattern but compose/Dockerfile only listed DEMO_MODE among public seller flags.
- **Version id:** T05 proposed `v1.1-seller`; consent grammar rejects suffixes → used **`v1.1`**.

### 3. REPO REALITY CHECK
- Stack: pnpm monorepo, Nest API, Next 14 web, Traefik compose on VPS `/opt/easycasa-ita`.
- API flags are runtime (`env_file` + recreate); web `NEXT_PUBLIC_*` need **build args** + `--no-cache` web rebuild.
- Inbox route: **`/seller/enquiries`** (not `/inbox`).
- Seller list wizard has **no** web dark flag — only API onboarding guard.
- Unauth seller API → **401**; flag-off → **404**.
- `gh` cannot merge — land via local merge / `git push origin HEAD:main`.

### 4. EFFORT SIGNAL
- Ops+docs sized correctly as one G1 gate. Unexpected extra: Docker ARG gap + second web rebuild (~same cost as a small follow-up PR).

### 5. BLOCKED / NEEDS A HUMAN
- Optional: external counsel firm countersign on packet PDFs.
- Dedicated PR to flip `savingsFigures` / `mediazioneCopy` → `live` (update `enforceCounselInterim` + reconcile `mediation-disclosure.md`).
- Claims 7–8 → boost/directory; Stripe Prices → premium.
- Bunny DPA before treating T10 CDN as cleared; §6.5 before T25.
- Kaizen: mark G1 complete with tip **`d037d8c`** + resources (`EC-S-g1-signoff-enablement.md`, this feedback).

### 6. NEXT TASK SHOULD ACCOUNT FOR
- Any new `NEXT_PUBLIC_*` feature flag **must** be added to `apps/web/Dockerfile` ARG/ENV **and** `infra/docker-compose.yml` `web.build.args` in the same PR that introduces the flag.
- Do not assume runtime `.env` alone lights Next dark routes.
- Keep ledger fallback until an explicit copy-flip brief; G1 ≠ auto-live EUR figures.
- Prefer one agent per Kaizen task code (lesson from T20 duplicate PRs).
