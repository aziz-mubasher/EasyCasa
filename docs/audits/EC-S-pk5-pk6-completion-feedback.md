# EC-S PK-5 + PK-6 — completion R&D feedback (for Claude)

**Date:** 2026-08-15  
**Authoriser:** AZM — *proceed to complete PK-5 and PK-6*  
**PR:** https://github.com/aziz-mubasher/EasyCasa/pull/173 (landed `main @ 9ee0bd7`)  
**Kaizen:** **PENDING Claude assignment** (did not invent codes)

## Live outcome

| Item | Result |
|------|--------|
| Migration `0068` | Applied on VPS |
| `SELLER_MESSAGING_ENABLED` | **true** |
| `IMAGE_DUPDETECT_ENFORCE` | **true** |
| Auth smoke | **PASS** — `PK56_AUTH_SMOKE_COMPLETE msg=200 send1=201 send2=201 inbox=200 pub_block=403` |
| Artifact | `/opt/cursor/artifacts/pk56_authenticated_smoke.log` |

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE
- Recorded AZM §6.5 hosting carve-out + T19.2 LIA, then shipped T25 messaging MVP + T19.2 enforce/suspend.
- No invented Kaizen codes.
- PK-7/PK-8 untouched.

### 2. WHERE THE BRIEF FAILED YOU
- No Kaizen codes → `PENDING Claude` in bridge.
- “Proceed to complete” treated as product-owner counsel gate close (same as G1 / PK-4 residual risk) — say explicitly next time if external counsel is still required before eng.
- Buyer web “my enquiries” UI not in brief — API supports both parties; seller composer only.

### 3. REPO REALITY CHECK
- Private-seller threads = `enquiry_messages` (not agency `conversations`/`messages`).
- Messaging flag is API-only; inbox returns `messagingEnabled` (no new `NEXT_PUBLIC_*`).
- Admin Abuse page added under Vite admin (`#abuse`).
- Dup moderation events now set `subjectUserId` so repeat-offender query works.

### 4. EFFORT SIGNAL
- Larger than an ops flip: greenfield messaging + suspend UX + migration + dual enablement. One AZM proceed covering two polish IDs was OK but Kaizen assignment should split or pair explicitly.

### 5. BLOCKED / NEEDS A HUMAN
- Claude: assign real Kaizen codes; replace `PENDING Claude` on board + ledger.
- Optional: admin-auth smoke for `POST /admin/abuse/users/:id/suspend` (DB suspend path proven via publish 403).
- PK-7 external counsel countersign still open.

### 6. NEXT TASK SHOULD ACCOUNT FOR
- Prefer Kaizen in brief before dispatch.
- Buyer enquiries UI is natural follow-up.
- Smoke cleanup must null `crm.seeker_profiles.first_enquiry_id` before deleting enquiries.
