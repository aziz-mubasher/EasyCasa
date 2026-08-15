# EC-S PP-1 / K EC 1.50 — completion R&D feedback (for Claude)

**As of tip `c4f8d3e` eng on `main` + Stripe Price backfill 2026-08-15.** Partner directory **self-serve Stripe checkout** shipped, deployed, and **purchasable**. Flag on (`PARTNER_DIRECTORY_ENABLED=true`). Migration **0065** applied. Live Price: `price_1U4dyaD5t2lALalHXqDTLh8k` (€49.00). Record: `docs/audits/EC-S-pp1-stripe-price-backfill.md`.

## What landed

| PR / tip | Role | Notes |
|----------|------|-------|
| [#155](https://github.com/aziz-mubasher/EasyCasa/pull/155) | Primary | Apply/me/checkout APIs; Stripe Checkout + webhook `kind=partner_directory`; web self-serve panel; admin checkbox; migration 0065 |
| Merge tip | `c4f8d3e` | Landed via `git push origin <branch>:main` (gh merge limited) |
| Bridge task | `task_7f48de29` | Agent IDLE after draft PR; merge+deploy by follow-up agent |
| VPS deploy | migration 0065 + api+web rebuild | Traefik pair recreate; `PARTNER_DIRECTORY_ENABLED=true` unchanged |
| Price backfill | 2026-08-15 | Product `prod_V4nZmmhC5A2zN4` + Price `price_1U4dyaD5t2lALalHXqDTLh8k` (€49); plans row updated |

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
| DB plan row (pre-backfill) | `partner_directory_placement` present; `stripe_price_id` **NULL** |
| Container flag | `PARTNER_DIRECTORY_ENABLED=true` |

## Price backfill smoke (2026-08-15)

| Check | Result |
|-------|--------|
| Plan `stripe_price_id` | `price_1U4dyaD5t2lALalHXqDTLh8k` · `price_cents=4900` |
| Auth `me` | `checkoutAvailable: true` |
| Auth apply → checkout | **201** → live Stripe Checkout URL (`cs_live_…`) |
| Unauth checkout | **401** |
| Artifact | `pp1_partner_directory_price_backfill_smoke.log` |

Optional: complete a real card payment to exercise webhook → `paid_placement=true` (smoke stopped before pay).

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE
- Plan key `partner_directory_placement` seeded empty; config-driven Price ID like premium.
- Partner flow: apply → checkout → webhook sets `paid_placement=true`; reuses `/billing/webhook`.
- Admin manual `paidPlacement` preserved; admin UI checkbox present.
- Labels/sort/UTM strip untouched; IT/EN/ES self-serve i18n; T04 — no amounts in copy.
- Flag gated by existing `PARTNER_DIRECTORY_ENABLED`. Empty catalogue banner unchanged.
- Chose **perpetual** one-time placement (no `paid_until`) — matches boolean admin model.
- **Ops:** live Price + DB backfill completed 2026-08-15; checkout no longer returns `plan not purchasable`.

### 2. WHERE THE BRIEF FAILED YOU
- No prior apply/claim ownership model — invented `POST /partners/directory/apply` (one row per user) + `GET /me`.
- Brief implied partner portal route — only public `/partner-directory` existed; self-serve panel embedded there.
- Building agent did not upsert bridge ledger at PR-open (seeded afterward as `pr_open`).
- **Backfill brief never named a euro amount** — seed left `price_cents=0`; ops chose €49.00 to unlock Checkout (documented; revisable).

### 3. REPO REALITY CHECK
- Stack: pnpm · Nest · Next · Drizzle · Traefik VPS `/opt/easycasa-ita` (`infra/docker-compose.yml` + `infra/docker-compose.traefik.yml` + `--env-file .env`).
- `gh` merge limited — land via `git push origin <branch>:main`.
- Unauth + flag on → **401**; flag off → **404**.
- Plans pattern: migration seed + SQL backfill of `stripe_price_id` (documented in `docs/env.md` / `docs/billing.md`).
- `plans` table has **no** `updated_at` column — UPDATE must omit it.

### 4. EFFORT SIGNAL
- Eng PR correctly one Kaizen. Price backfill is a separate small ops pass (create Product/Price + SQL + purchasability smoke).

### 5. BLOCKED / NEEDS A HUMAN
- Mark **K EC 1.50** complete on Kaizen (Notion MCP needsAuth here).
- Confirm or revise €49 launch fee if product wants a different amount (new Stripe Price + UPDATE).
- Optional: real card → webhook → paid badge + preferential sort smoke.
- Forward this feedback + status block to Claude.

### 6. NEXT TASK SHOULD ACCOUNT FOR
- Always include the **euro amount** (or “use seed price_cents”) when asking for Stripe Price backfill.
- Next ops: **V-1** authenticated viewings book/confirm; **PK-1** when moderation ready.

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
summary: PP-1 MERGED+DEPLOYED; Stripe Price backfilled (€49 price_1U4dya…); checkoutAvailable true; apply→Checkout URL smoke PASS.
nextAction: Mark Kaizen K EC 1.50 complete; optional real-pay webhook smoke; confirm/revise €49 if needed.
pollUrl: https://raw.githubusercontent.com/aziz-mubasher/EasyCasa/main/docs/azm-deliverables/_bridge/status-ledger.json
<!-- AZM_BRIDGE_STATUS_END -->
```
