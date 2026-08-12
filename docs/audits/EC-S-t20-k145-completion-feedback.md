# EC-S-T20 / K EC 1.45 — completion R&D feedback (for Claude)

**As of tip `123a5c8` on `main` after T20 seller inbox web UI + CI hygiene.** Ships **dark** (`SELLER_INBOX_ENABLED` / `NEXT_PUBLIC_SELLER_INBOX_ENABLED` remain **false** on VPS). No G-gate flips. No new SQL migrations. Web rebuilt; `/it/seller/enquiries` → **404** (expected).

## What landed

| PR | Role | Notes |
|----|------|-------|
| [#137](https://github.com/aziz-mubasher/EasyCasa/pull/137) | Primary merge | Route `/{locale}/seller/enquiries`; panel + CSS; `NEXT_PUBLIC_SELLER_INBOX_ENABLED`; CI `rg`→`grep` fallback in `.sh` |
| [#135](https://github.com/aziz-mubasher/EasyCasa/pull/135) | Superseded (conflict) | Same scope via `/seller/inbox` + `.mjs` CI + dashboard nav — closed as duplicate after #137 won the race |
| Follow-up on `main` | Nav finish | `SellerDashboardNav` adapted to `/seller/enquiries`, gated by web flag (from #135 intent) |

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE
- T20 web inbox UI mounted on existing `GET/PATCH /seller/enquiries` API; read-only (list + mark-read); IT/EN/ES via `sellerInbox`; empty/loading/error/unavailable; no composer (T25 fence).
- CI `check:seller-hardcoded-strings` fixed for runners without `rg`.
- Flags stay off — prod behaviour unchanged until G1 + dual-flag flip.

### 2. WHERE THE BRIEF FAILED YOU
- **Duplicate Bridge agents:** K EC 1.45 (#135) and a parallel EC-S-T20 agent (#137) shipped overlapping PRs within minutes. #137 merged first; #135 went CONFLICTING. **Next time: one agent per task code**, or cancel the second when the first opens a PR.
- **Route path ambiguous:** #135 used `/seller/inbox`; #137 used `/seller/enquiries` (closer to API path). Landed path is **`/seller/enquiries`**.
- **Web flag pattern:** #137 correctly added `NEXT_PUBLIC_SELLER_INBOX_ENABLED` (build-time 404) mirroring Aste dual-flag pattern. Brief that only mentions API `SELLER_INBOX_ENABLED` underspecifies Next App Router dark routes — always pair public mirror for server `notFound()`.
- **Nav:** #135 had seller shell nav; #137 omitted it. Follow-up landed nav pointing at `/seller/enquiries`.

### 3. REPO REALITY CHECK
- Stack unchanged: pnpm, Nest, Next, Vitest.
- Inbox API already on `main` from Phase 3 (#112); this task was **web-only + CI**.
- Seller layout already had T32 consent shell — nav mounts beside it.
- VPS must set **both** `SELLER_INBOX_ENABLED` and `NEXT_PUBLIC_SELLER_INBOX_ENABLED` before enablement; rebuild **web** for the public flag.

### 4. EFFORT SIGNAL
- Right-sized once API existed. Duplicate agents wasted review/merge time more than coding time.

### 5. BLOCKED / NEEDS A HUMAN
- **G1** before flipping inbox flags.
- Dual-flag flip + web rebuild when enabling.
- Kaizen board: mark K EC 1.45 complete with PR #137 (+ follow-up tip).

### 6. NEXT TASK SHOULD ACCOUNT FOR
- Prefer `/seller/enquiries` (not `/inbox`) in future briefs.
- Always specify `NEXT_PUBLIC_*` mirror for dark Next routes.
- Do not double-dispatch the same Kaizen code to two Cursor agents.
- Optional later: listing titles on cards (API today returns UUID only).

## Deploy smoke
- Flags **false** → `/it/seller/enquiries` **404**; nav inbox link **hidden**.
- `/api/version` matches deploy tip after web rebuild.
- No migrations.
