# EC-S PP-4 / K EC 1.47 — completion R&D feedback (for Claude)

**As of tip `c67c8ad` on `main` + VPS `/opt/easycasa-ita` tip `c67c8ad` (2026-08-14).** Seller onboarding **web form** shipped and deployed. Flags already on (`SELLER_ONBOARDING_ENABLED=true`, `INFORMATIVA_SELLER_VERSION=v1.1`). No new env vars. No migrations.

## What landed

| PR / tip | Role | Notes |
|----------|------|-------|
| [#150](https://github.com/aziz-mubasher/EasyCasa/pull/150) | Primary | Onboarding form + wizard/shell gate + i18n IT/EN/ES; listing-drafts `@Roles` includes `buyer` |
| Merge tip | `c67c8ad` | Conflict-resolved with main (kept V-1 closed); polish/journey mark PP-4 closed |
| VPS deploy | web + api rebuild | Traefik pair recreate; route `/[locale]/seller/onboarding` in image |

## Deploy smoke (2026-08-14)

| Check | Result |
|-------|--------|
| `https://easycasaita.com/api/health` | **200** |
| `https://easycasaita.com/api/seller/me` (unauth) | **401** (flag on; not 404) |
| `https://easycasaita.com/it/seller/onboarding` | **200** — HTML contains `Nome visualizzato`, `Telefono`, `informativa`, `sellerOnboarding` |
| `/en/seller/onboarding` | **200** |
| Container flags | `SELLER_ONBOARDING_ENABLED=true`, informativa `v1.1` |

Authenticated zero-curl path (OIDC → form → wizard → publish) left for operator with a fresh account.

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE
- Web form for `POST /seller/onboarding`: display name, phone, optional marketing, Layer 1 informativa acceptance on submit (no separate checkbox — matches API/T05 design).
- Mounted in listing wizard when profile missing **and** at `/seller/onboarding` with shell gate for dark-profile users.
- Reuses T32 consent interstitial pattern for version mismatch; IT/EN/ES via `sellerOnboarding`.
- No new API endpoints; no `NEXT_PUBLIC_*`; no flag flips.
- Journey/polish docs updated: stage 2 ✅ LIVE; PP-4 CLOSED.

**Deviation:** `listing-drafts` `@Roles` extended to include `buyer`. JWT often still carries `buyer` after onboarding while DB role promotes to seller; without this, post-submit draft create 403s. Service still requires `seller_profile` via `requireSeller()`.

### 2. WHERE THE BRIEF FAILED YOU
- **Bridge feedback:** `task_89efec62` opened PR #150 at 06:58 UTC but Claude still said “still running, no PR” — agent never wrote a pollable status. Separate fix: public ledger + Cursor rule (`docs/runbooks/azm-dev-bridge.md`).
- **Merge conflict:** journey doc diverged after V-1 closed on `main` while PP-4 branch still had V-1 UNVERIFIED — resolved keeping V-1 CLOSED + PP-4 merged.
- Brief path typo in deliverable copy (`seller-dashboard-sop.md`) — canonical is `docs/runbooks/seller-dashboard.md`.

### 3. REPO REALITY CHECK
- Stack: pnpm monorepo · Nest API · Next web · Traefik VPS `/opt/easycasa-ita`.
- Onboarding API + flags already live from G1; this task was the **web first-mile**.
- Seller shell already had T32 consent; gate mounts alongside.
- `gh` merge limited — land via `git push origin <branch>:main`.

### 4. EFFORT SIGNAL
- Right-sized once API existed (comparable to T20 inbox UI). Conflict resolve + deploy were the ops cost, not the form itself.

### 5. BLOCKED / NEEDS A HUMAN
- Kaizen: mark **K EC 1.47** complete with PR #150 + tip **`c67c8ad`**.
- Operator smoke: fresh OIDC user → `/it/seller/list` → onboarding form → publish → `GET /seller/me` → `consent.decision=ok`.
- Forward this feedback + bridge status block to Claude.

### 6. NEXT TASK SHOULD ACCOUNT FOR
- **Dispatch PP-5** (monetisation UI) next — highest revenue leverage; boost/premium flags already on.
- Include `bridgeTaskId` in every `send_dev_task` brief; require Cursor `azm-bridge-status` upsert on PR-open.
- Buyer JWT vs seller role mismatch is a standing footgun for any post-onboarding seller write path — prefer service-layer profile checks over JWT role alone, or document role claim refresh.

## Bridge status (for Claude poll)

```
<!-- AZM_BRIDGE_STATUS_BEGIN -->
bridgeTaskId: task_89efec62
kaizenCode: K EC 1.47
polishId: PP-4
lifecycle: merged
agentStatus: IDLE
prUrl: https://github.com/aziz-mubasher/EasyCasa/pull/150
prState: MERGED
summary: PP-4 / K EC 1.47 MERGED + DEPLOYED at tip c67c8ad. Onboarding web live; unauth /seller/me → 401; /it/seller/onboarding → 200.
nextAction: Mark Kaizen K EC 1.47 complete; dispatch PP-5; optional authenticated zero-curl smoke.
pollUrl: https://raw.githubusercontent.com/aziz-mubasher/EasyCasa/main/docs/azm-deliverables/_bridge/status-ledger.json
<!-- AZM_BRIDGE_STATUS_END -->
```
