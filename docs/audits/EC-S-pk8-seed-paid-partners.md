# EC-S PK-8 — Seed first paid partners (2026-08-15)

**Authoriser:** AZM via Cursor — *proceed for pk 7 and pk 8*  
**Kaizen:** **PENDING Claude PK-7+8**  
**Bridge:** `task_pk7_pk8`  
**Scope:** Admin-style seed of `partner_directory` rows with `paid_placement=true` so the public directory shows labelled paid presence (G3 row 9).

## Why seed (not outreach)

Live catalogue was **empty** (`paid=0`, `total=0`). Informational banner was correct (standing rule §C.13). AZM proceed authorises a **pilot Mundida desk seed** until independent professionals onboard via PP-1 self-serve checkout or admin outreach.

## Seed design (non-impersonation)

| Rule | Implementation |
|------|----------------|
| No fake albo / individual professionals | Names are **“EasyCasa Pilot · {category} · {province}”** |
| Contact | Shared desk `partner-directory@easycasaita.com` |
| Credentials | Explicit pilot / Mundida desk wording |
| Paid | `paid_placement=true`, `active=true`, `user_id` NULL (admin-seeded) |
| Provinces | MI, RM, BS, NA, TO — one row per category across the set |

Migration: `migration/sql/0069_ecs_pk8_seed_paid_partners.sql` (idempotent on contact+name+province).

## Ops

```bash
# After pull on VPS
docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env \
  exec -T db psql -U easycasa -d easycasa -v ON_ERROR_STOP=1 \
  < migration/sql/0069_ecs_pk8_seed_paid_partners.sql
# No api/web rebuild required for seed-only (schema already has paid_placement).
```

## Smoke

| Check | Expected |
|-------|----------|
| `SELECT count(*) FILTER (WHERE paid_placement) FROM partner_directory` | ≥ 5 |
| `GET /api/partners/directory` | items with `paidPlacement: true` |
| `/it/partner-directory` no-script HTML | `Presenza a pagamento` present; empty copy gone for default filters |

## Rollback

```sql
DELETE FROM partner_directory
WHERE contact = 'partner-directory@easycasaita.com'
  AND credentials LIKE 'PK-8 pilot%';
```

## Explicit non-goals

- No Stripe charge for these rows (admin seed, not PP-1 checkout)
- No outbound UTM / referral tracking (still stripped)
- No claim that listed names are enrolled professionals
