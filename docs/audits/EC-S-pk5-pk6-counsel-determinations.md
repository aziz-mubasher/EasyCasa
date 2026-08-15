# EC-S PK-5 + PK-6 — counsel / product-owner determinations (2026-08-15)

**Authoriser:** AZM via Cursor — *proceed to complete PK-5 and PK-6*  
**Kaizen:** **PENDING Claude assignment** — do **not** invent board codes (K EC 1.54/1.55 lesson)  
**Bridge:** `task_pk5_pk6`

## Determinations recorded

| Gate | Doc | Decision |
|------|-----|----------|
| T05 §3.1 / §6.5 message controllership | `docs/legal/ec-s-t05-seller-data-memo.md` | **Hosting carve-out for message content**; EasyCasa **controller for transport metadata** (aligns T04 row 5) |
| T19.2 LIA | `docs/legal/ec-s-t19-2-lia.md` | **Art. 6(1)(f) accepted** for dup-enforce + manual suspend |

## Eng consequences

| ID | Work | Flag / surface |
|----|------|----------------|
| **PK-5** | T25 enquiry-thread messaging MVP | `SELLER_MESSAGING_ENABLED` (API runtime; list payload exposes `messagingEnabled`) |
| **PK-6** | Dup enforce + suspend UX | `IMAGE_DUPDETECT_ENFORCE=true` + `POST /admin/abuse/users/:id/suspend\|unsuspend` + admin Abuse page |

## Explicit non-goals

- No invented Kaizen codes
- No PK-7 external counsel countersign
- No PK-8 partner seeding
- Agency `conversations`/`messages` tables remain buyer↔agent only — private-seller uses `enquiry_messages`
