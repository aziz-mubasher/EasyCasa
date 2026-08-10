# EC-S Phase 2 — Trust & verification (T14–T19)

**Status:** Engineering in progress 2026-08-10.  
**Pre-brief:** `docs/audits/EC-S-phase2-feedback.md`  
**Prod HEAD at kickoff:** `329e963` (+ docs `dbd6bdd`)

## Migration ids

Aste already used `0050` / `0051`. Phase 2 VO/checklist:

| SQL | Task |
|-----|------|
| `0052_ecs_phase2_verified_owner.sql` | T14 |
| `0053_ecs_phase2_seller_checklist.sql` | T18 (follow-up) |

## Task status

| Task | Status | Notes |
|------|--------|-------|
| T14.0 Private-doc authZ | ✅ | `/media/file` — `users/*/docs` owner/admin only |
| T14 VO FSM + upload | 🟡 | `@easycasa/shared` machine + Nest `/seller/vo/*`; flag off |
| T16 Name match | 🟡 | Folded into T14 submit (advisory) |
| T18 Seller checklist | ✅ | SQL 0053 `seller_doc_checklist`; `/seller/checklist/*`; flag off |
| T17 Trust signals | ✅ | `ListingSummary.trust` + ListingCard chips; daysOnMarket from publishedAt∥createdAt |
| T19 Abuse stage 1 | 🟡 | `moderation_flag` set on dup events; rate-limit env knobs |

## Env

- `VERIFIED_OWNER_ENABLED` (default false)
- `VERIFIED_OWNER_VALIDITY_MONTHS` (default 12)

## Enable gates (human)

1. T05 Layer 1 + §6.3 → set informativa version + `SELLER_ONBOARDING_ENABLED` + `VERIFIED_OWNER_ENABLED`
2. T04 row 7 counsel confirm
3. Do **not** flip P3 until T14+T15+T16+T17 pass
