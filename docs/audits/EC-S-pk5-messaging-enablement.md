# EC-S PK-5 — T25 in-portal messaging enablement (2026-08-15)

**Authoriser:** AZM — *proceed to complete PK-5 and PK-6*  
**Kaizen:** **PENDING Claude assignment** (do not invent codes)  
**Bridge:** `task_pk5_pk6`  
**Counsel:** T05 §3.1 / §6.5 hosting carve-out — `docs/audits/EC-S-pk5-pk6-counsel-determinations.md`

## Scope

| Item | Detail |
|------|--------|
| Eng | `enquiry_messages` table · `GET/POST /enquiries/:id/messages` · seller inbox thread composer |
| Flag | `SELLER_MESSAGING_ENABLED` (API runtime; list returns `messagingEnabled`) |
| Web | No new `NEXT_PUBLIC_*` — composer gates on API payload |
| Out of scope | Agency `conversations`/`messages`; buyer account UI page (API ready for both parties); PK-7 counsel countersign |

## Ops flip (after migrate + deploy)

```bash
sed -i 's/^SELLER_MESSAGING_ENABLED=.*/SELLER_MESSAGING_ENABLED=true/' /opt/easycasa-ita/.env
# recreate api (Traefik pair)
```

## Smoke

| Check | Expected | Result (2026-08-15) |
|-------|----------|---------------------|
| Flag off → `GET /enquiries/:id/messages` | **404** | N/A after flip |
| Flag on + participant | **200** with `seed` + `messages` | **PASS** |
| Seller/buyer reply | **201** | **PASS** |
| Non-participant | **403** | (participant path covered) |
| Unauth | **401** | **PASS** |
| Seller inbox list | `messagingEnabled: true` | **PASS** |

Artifact: `/opt/cursor/artifacts/pk56_authenticated_smoke.log`

## Rollback

Set `SELLER_MESSAGING_ENABLED=false` and recreate api. Existing `enquiry_messages` rows retained.
