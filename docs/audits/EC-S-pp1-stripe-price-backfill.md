# EC-S PP-1 — partner directory Stripe Price backfill (2026-08-15)

**Authoriser:** AZM via Cursor instruction — *proceed with PP-1 Stripe Price ID backfill*  
**Kaizen:** K EC 1.50 · **Polish:** PP-1  
**Scope:** Live Stripe Product + one-time Price + `plans.stripe_price_id` for `partner_directory_placement`.  
**Out of scope:** VO/CDN; changing G3 labels/sort; webhook payment completion (left for real partner purchase).

## Amount decision

Migration `0065` seeded `price_cents=0` and empty `stripe_price_id` by design (no fee in repo / T04). No prior Product existed in live Stripe.

| Choice | Value | Rationale |
|--------|-------|-----------|
| Launch fee | **€49.00** one-time (`4900` cents) | Between listing boost 30d (€24.90) and SV Patente one-time (€199); perpetual directory presence |
| Currency | EUR | Matches other EasyCasa Stripe Prices |
| Tax | `exclusive` | Same as seller premium / boost Prices; Checkout still uses automatic tax where configured |
| Mode | **live** (`sk_live_…`) | Production VPS |

**Fee confirmation:** AZM confirmed €49 launch fee is OK (2026-08-15 chat).

## Stripe artefacts (live mode)

| Artefact | Amount | ID |
|----------|--------|-----|
| Product EasyCasa Partner Directory Placement | — | `prod_V4nZmmhC5A2zN4` |
| Price `partner_directory_placement` (one-time) | €49.00 | `price_1U4dyaD5t2lALalHXqDTLh8k` |

Metadata: `plan_key=partner_directory_placement`, `kind=partner_directory`, `fee_type=flat_once`, `t04_row=9`, `polish=PP-1`.

## Ops flips (VPS `/opt/easycasa-ita`)

| Target | Before | After |
|--------|--------|-------|
| `plans.stripe_price_id` where `key=partner_directory_placement` | NULL | `price_1U4dyaD5t2lALalHXqDTLh8k` |
| `plans.price_cents` | 0 | **4900** |
| `PARTNER_DIRECTORY_ENABLED` | `true` | unchanged |

No api recreate required (plans are DB-read at request time).

```sql
UPDATE plans
SET stripe_price_id = 'price_1U4dyaD5t2lALalHXqDTLh8k',
    price_cents = 4900,
    currency = 'EUR',
    interval = 'once'
WHERE key = 'partner_directory_placement';
```

## Verification (2026-08-15)

| Check | Result |
|-------|--------|
| Plan row has Price ID + 4900 cents | **PASS** |
| Auth `GET /api/partners/directory/me` | **200** — `checkoutAvailable: true` |
| Auth `POST /api/partners/directory/apply` | **201** — row created |
| Auth `POST /api/partners/directory/checkout` | **201** — `https://checkout.stripe.com/c/pay/cs_live_…` |
| Unauth checkout | **401** |
| Smoke cleanup | partner row + ephemeral KC client/user deleted |

Artifact: `/opt/cursor/artifacts/pp1_partner_directory_price_backfill_smoke.log` (`PP1_SMOKE_COMPLETE … checkout=201`).

**Note:** smoke did **not** complete payment (no charge). Full apply→pay→webhook→`paid_placement` remains an optional live purchase smoke.
