# EC-S PK-4 / K EC 1.55 — completion R&D feedback (for Claude)

**As of tip `59295f6` on `main` + VPS `/opt/easycasa-ita` on `main` @ `59295f6` (2026-08-15).** Bunny listing CDN **LIVE**; VO/checklist private docs remain MinIO. Enablement: `docs/audits/EC-S-pk4-cdn-enablement.md`.

## What landed

| Item | Notes |
|------|-------|
| Flag | `MEDIA_CDN_ENABLED=true` (api rebuild + recreate) |
| Origin | `MEDIA_ORIGIN=bunny` (already set) |
| CDN host | `https://easycasa1.b-cdn.net` |
| Private docs | Always MinIO (`resolveMinioObjectStorage`) |
| Hash overflow | AI dhash outside PG int64 → fail-soft null |
| Bridge | `task_pk4_cdn` · K EC 1.55 |

## Deploy + smoke

| Check | Result |
|-------|--------|
| Container CDN / origin | **true** / **bunny** |
| Existing CDN image | **200** |
| Auth listing upload | **201** → `easycasa1.b-cdn.net/media/…webp` |
| Auth VO submit | **201** → `users/…` docKeys |

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE
- Executed PK-4 after AZM “proceed with pk 4”.
- Flip + dual-store eng only; did not flip T25/T19.2 or custom CDN hostname.

### 2. WHERE THE BRIEF FAILED YOU
- No Kaizen code — used **K EC 1.55**.
- Brief said “Bunny DPA signed” but did not attach a DPA PDF/date — recorded as product-owner authorisation via proceed instruction.
- Docs assumed `cdn.easycasaita.com`; live host is **`easycasa1.b-cdn.net`** (custom host SSL broken).
- Enabling CDN without eng would **break VO/checklist** (`putPrivateUserDoc` refused Bunny) — not called out in polish one-liner.
- First upload smoke hit unsigned dhash > PG bigint — latent AI hash bug.

### 3. REPO REALITY CHECK
- Stack: pnpm · Nest · Next · Traefik VPS · Bunny Storage HTTP API (not S3) for listing masters.
- 588+ existing media rows already on Bunny CDN; gate only blocked *new* writes to MinIO.
- Private base: `https://easycasaita.com/api/media/file`.
- Traefik compose pair mandatory; api image rebuild required for eng.

### 4. EFFORT SIGNAL
- Larger than a pure ops flip: required eng dual-store + hash sanitizer + two api rebuilds. Still correctly one Kaizen.

### 5. BLOCKED / NEEDS A HUMAN
- Mark **K EC 1.55** complete on Kaizen (Notion needsAuth) — **or replace** with a real Claude-issued Kaizen if board rejects invented codes.
- **Bunny DPA not evidenced** — close gap (`docs/audits/EC-S-pk4-dpa-gap.md`): cite countersigned DPA, or rollback `MEDIA_CDN_ENABLED`, or accept residual risk in writing.
- Optional: TLS for `cdn.easycasaita.com` if brand hostname desired.
- Optional: Bunny purge API key for GDPR erasure; Optimizer width whitelist.

### 6. NEXT TASK SHOULD ACCOUNT FOR
- PK CDN briefs must require dual-store private MinIO check before flag flip.
- Prefer live CDN host from VPS `.env` over stale docs hostname.
- Include Kaizen code + DPA evidence fields in enablement briefs.

## Bridge status

```
<!-- AZM_BRIDGE_STATUS_BEGIN -->
bridgeTaskId: task_pk4_cdn
kaizenCode: K EC 1.55
polishId: PK-4
lifecycle: merged
agentStatus: IDLE
prUrl: https://github.com/aziz-mubasher/EasyCasa/pull/169
prState: MERGED
summary: PK-4 MERGED+DEPLOYED. MEDIA_CDN_ENABLED=true; upload→b-cdn.net PASS; VO MinIO PASS. Docs on main via #169.
nextAction: Mark Kaizen K EC 1.55 complete; optional cdn.easycasaita.com TLS.
pollUrl: https://raw.githubusercontent.com/aziz-mubasher/EasyCasa/main/docs/azm-deliverables/_bridge/status-ledger.json
<!-- AZM_BRIDGE_STATUS_END -->
```
