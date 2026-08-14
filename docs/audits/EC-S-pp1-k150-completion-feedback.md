# EC-S PP-1 / K EC 1.50 — completion R&D feedback (for Claude)

**As of tip `c4f8d3e` on `main` + VPS `/opt/easycasa-ita` tip `c4f8d3e` (2026-08-14).** Partner directory **self-serve Stripe checkout** shipped and deployed. Flag already on (`PARTNER_DIRECTORY_ENABLED=true`). Migration **0065** applied. **Live Checkout still blocked** until AZM backfills `plans.stripe_price_id` for `partner_directory_placement` (seed left NULL by design).

## What landed

| PR / tip | Role | Notes |
|----------|------|-------|
| [#155](https://github.com/aziz-mubasher/EasyCasa/pull/155) | Primary | Apply/me/checkout APIs; Stripe Checkout + webhook `kind=partner_directory`; web self-serve panel; admin checkbox; migration 0065 |
| Merge tip | `c4f8d3e` | Landed via `git push origin <branch>:main` (gh merge limited) |
| Bridge task | `task_7f48de29` | Agent IDLE after draft PR; merge+deploy by follow-up agent |
| VPS deploy | migration 0065 + api+web rebuild | Traefik pair recreate; `PARTNER_DIRECTORY_ENABLED=true` unchanged |

## Deploy smoke (2026-08-14)

| Check | Result |
|-------|--------|
| `https://easycasaita.com/api/health` | **200** |
| `https://easycasaita.com/api/version` | **200** — `gitSha=c4f8d3e` |
| `GET /api/partners/directory` | **200** — empty catalogue + informational label (correct) |
| `GET /api/partners/directory/me` unauth | **401** |
| `POST /api/partners/directory/apply` unauth | **401** |
| `POST /api/partners/directory/checkout` unauth | **401** |
| `/it/partner-directory` | **200** — HTML has `partnerDirectory` / `selfServe` / `Presenza a pagamento` |
| DB plan row | `partner_directory_placement` present; `stripe_price_id` **NULL** |
| Container flag | `PARTNER_DIRECTORY_ENABLED=true` |
| Parked VO/checklist | Not flipped (PK-1/PK-2) |

Authenticated apply → Checkout → webhook → paid badge left for operator **after** Price ID backfill.

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE
- Plan key `partner_directory_placement` seeded empty; config-driven Price ID like premium.
- Partner flow: apply → checkout → webhook sets `paid_placement=true`; reuses `/billing/webhook`.
- Admin manual `paidPlacement` preserved; admin UI checkbox present.
- Labels/sort/UTM strip untouched; IT/EN/ES self-serve i18n; T04 — no amounts in copy.
- Flag gated by existing `PARTNER_DIRECTORY_ENABLED`. Empty catalogue banner unchanged.
- Chose **perpetual** one-time placement (no `paid_until`) — matches boolean admin model.

### 2. WHERE THE BRIEF FAILED YOU
- No prior apply/claim ownership model — invented `POST /partners/directory/apply` (one row per user) + `GET /me`.
- Brief implied partner portal route — only public `/partner-directory` existed; self-serve panel embedded there.
- Building agent did not upsert bridge ledger at PR-open (seeded afterward as `pr_open`).

### 3. REPO REALITY CHECK
- Stack: pnpm · Nest · Next · Drizzle · Traefik VPS `/opt/easycasa-ita` (`infra/docker-compose.yml` + `infra/docker-compose.traefik.yml` + `--env-file .env`).
- `gh` merge limited — land via `git push origin <branch>:main`.
- Unauth + flag on → **401**; flag off → **404**.
- Plans pattern: migration seed + SQL backfill of `stripe_price_id` (documented in `docs/env.md` / `docs/billing.md`).

### 4. EFFORT SIGNAL
- Correctly one PR. Slightly larger than “checkout only” because apply/claim + web panel + admin checkbox gap had to be invented.

### 5. BLOCKED / NEEDS A HUMAN
- **Stripe Price backfill (blocks live pay):** create one-time Product/Price, then  
  `UPDATE plans SET stripe_price_id = 'price_…' WHERE key = 'partner_directory_placement';`
- Kaizen: mark **K EC 1.50** complete (Sales) with PR #155 + tip **`c4f8d3e`** (feedback tip may advance docs-only).
- Operator: signed-in partner → apply → Checkout → webhook → paid badge + preferential sort.
- Forward this feedback + status block to Claude.

### 6. NEXT TASK SHOULD ACCOUNT FOR
- Next polish eng: **PP-2** housekeeping (or PK-1/PK-2 enablement if product decides).
- Include `bridgeTaskId` in every dispatch so Cursor upserts ledger at PR-open.
- If renewal/expiry ever required, new brief — would add `paid_until` and break perpetual assumption.
- Consider locale-aware partner success URL (today reuses `BILLING_SUCCESS_URL`).

## Bridge status (for Claude poll)

```
<!-- AZM_BRIDGE_STATUS_BEGIN -->
bridgeTaskId: task_7f48de29
kaizenCode: K EC 1.50
polishId: PP-1
lifecycle: merged
agentStatus: IDLE
prUrl: https://github.com/aziz-mubasher/EasyCasa/pull/155
prState: MERGED
summary: PP-1 / K EC 1.50 MERGED + DEPLOYED at tip c4f8d3e. Migration 0065 applied; /it/partner-directory 200 with selfServe; unauth partner APIs → 401. Live Checkout blocked until stripe_price_id backfill.
nextAction: Mark Kaizen K EC 1.50 complete; AZM create Stripe one-time Price + UPDATE plans; authenticated apply→pay→webhook smoke; next PP-2 or PK decisions.
pollUrl: https://raw.githubusercontent.com/aziz-mubasher/EasyCasa/main/docs/azm-deliverables/_bridge/status-ledger.json
<!-- AZM_BRIDGE_STATUS_END -->
```
