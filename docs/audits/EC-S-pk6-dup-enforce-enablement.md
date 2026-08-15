# EC-S PK-6 — T19.2 dup-enforce + suspend UX enablement (2026-08-15)

**Authoriser:** AZM — *proceed to complete PK-5 and PK-6*  
**Kaizen:** **PENDING Claude assignment** (do not invent codes)  
**Bridge:** `task_pk5_pk6`  
**LIA:** `docs/legal/ec-s-t19-2-lia.md` — **accepted**

## Scope

| Item | Detail |
|------|--------|
| Ops | `IMAGE_DUPDETECT_ENFORCE=true` |
| Eng | `users.suspended_at` / `suspend_reason` · `POST /admin/abuse/users/:id/suspend\|unsuspend` · admin Abuse page |
| Effect of suspend | Unpublish all owned published listings; block media upload + listing publish |
| Out of scope | Automated suspend; account deletion; NEAR_DUPLICATE hard-block |

## Ops flip (after migrate + deploy)

```bash
sed -i 's/^IMAGE_DUPDETECT_ENFORCE=.*/IMAGE_DUPDETECT_ENFORCE=true/' /opt/easycasa-ita/.env
# recreate api (Traefik pair)
```

## Smoke

| Check | Expected |
|-------|----------|
| Container env `IMAGE_DUPDETECT_ENFORCE` | `true` |
| Exact DUPLICATE upload (enforce) | **400** `duplicate image blocked` |
| Admin suspend (reason ≥10) | **200** + listings unpublished |
| Suspended publish/upload | **403** `account suspended` |
| Admin unsuspend | clears `suspended_at` |

## Rollback

Set `IMAGE_DUPDETECT_ENFORCE=false` and recreate api. Unsuspend any wrongly suspended users via admin Abuse UI / API.
