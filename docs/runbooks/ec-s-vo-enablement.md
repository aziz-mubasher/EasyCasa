# Runbook — EC-S PK-1 Verified Owner enablement (prepare only)

**Status:** Prepared 2026-08-14 (K EC 1.52). **Do not execute** until AZM confirms moderation capacity.  
**Prerequisite:** PP-6 seller UI merged (#153). PK-2 checklist already live separately.  
**Goal:** ~10-minute ops flip + smoke when go/no-go is green.

---

## 1. Go/no-go preconditions (AZM must satisfy first)

| # | Precondition | Why it blocks PK-1 |
|---|--------------|-------------------|
| 1 | **Named VO reviewer(s)** with Keycloak `admin` + realm role granting `admin_operations` or `admin_superadmin` (`vo_moderation` capability) | Queue is useless without a human who can Claim → Verify/Reject |
| 2 | **Target turnaround SLA** documented (e.g. 2 business days) and communicated to sellers | Submissions sit in `submitted` until claimed; no auto-verify |
| 3 | **Stall policy** — what sellers see if review exceeds SLA; who escalates | FSM has no seller-facing SLA timer; only `submitted` / `in_review` states |
| 4 | **Document retention** per T05 §1 — verification docs: outcome + 12m; originals deleted on account deletion | Counsel table still has open checkboxes; ops must not delete docs ad hoc |
| 5 | **Reject reason discipline** — reviewers use canonical phrases (see §4) or accept free-text maps to generic seller copy | Admin UI is free-text only (gap — see §7) |
| 6 | **Premium priority understood** — premium sellers sort earlier in queue; **does not** change verification standards | Documented in admin VO page copy |

**PK-1 decision hinges on:** items 1–3 (people + SLA + stall UX). Legal retention (4) should be acknowledged; reject UX (5) is a known product gap.

---

## 2. Flags and deploy commands

| Variable | PK-1 target | Notes |
|----------|-------------|-------|
| `VERIFIED_OWNER_ENABLED` | `true` | Runtime API — **no** `NEXT_PUBLIC_*` mirror in PP-6 |
| `SELLER_CHECKLIST_ENABLED` | unchanged (`true` after PK-2) | Independent gate |
| `VERIFIED_OWNER_VALIDITY_MONTHS` | default `12` | Sets badge expiry on VERIFY |

### VPS steps (`/opt/easycasa-ita`)

```bash
cd /opt/easycasa-ita
git fetch origin main && git checkout main && git pull origin main

# Ledger P3 live must be merged on main first (see §5)
sed -i 's/^VERIFIED_OWNER_ENABLED=false/VERIFIED_OWNER_ENABLED=true/' .env
grep -E '^(VERIFIED_OWNER|SELLER_CHECKLIST)_ENABLED' .env

# API only — web rebuild NOT required for the flag
docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env \
  up -d --no-deps --force-recreate api

docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env \
  exec -T api printenv VERIFIED_OWNER_ENABLED SELLER_CHECKLIST_ENABLED VERIFIED_OWNER_VALIDITY_MONTHS
```

**Web rebuild for P3 ledger:** Required when `promises.P3.state` flips `coming` → `live` (same as PK-2 / Claim 1–2 pattern):

```bash
docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env \
  build --no-cache web
docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env \
  up -d --no-deps --force-recreate web
```

---

## 3. Admin VO moderation queue

| Item | Value |
|------|-------|
| **URL** | `https://admin.easycasaita.com/#vo` |
| **Nav label** | Verified Owner |
| **Capability** | `vo_moderation` — `admin_operations` / `admin_superadmin` only (**not** AML) |
| **API** | `GET /api/admin/vo/queue`, `GET /api/admin/vo/:caseId`, `POST …/claim`, `…/verify`, `…/reject` |

### Reviewer workflow

1. Open queue — rows in `submitted` or `in_review`.
2. **Claim** — transitions `submitted` → `in_review` (409 if already claimed).
3. Open case — review private doc links (`/api/media/file/{key}` — authZ required).
4. Read **Name match** advisory chip (`match` / `partial` / `no_match` / `company` + score). **Never auto-verifies.**
5. **Verify** — `in_review` → `verified`; badge live; `expires_at = now + VERIFIED_OWNER_VALIDITY_MONTHS`.
6. **Reject** — requires free-text reason (min 3 chars) → `rejected`; seller may resubmit.

### Templated reject reasons (seller-facing)

Seller UI maps exact moderator strings to i18n templates (`sellerTrust.rejectionTemplates.*`):

| Paste exactly (EN or IT alias) | Seller sees |
|--------------------------------|-------------|
| `illegible document` / `documento illeggibile` | Illegible scan message |
| `name mismatch` / `nome non corrisponde` | Name mismatch message |
| `document expired` / `documento scaduto` | Expired doc message |
| `incomplete submission` / `documenti incompleti` | Incomplete message |
| `wrong listing` / `annuncio errato` | Wrong listing message |

Any other text → generic “Motivo indicato dal revisore: {reason}”.

**Gap:** Admin UI has no template picker — reviewers must paste canonical phrases manually or sellers get generic copy.

---

## 4. Seller-side state transitions

| API `VoState` | Seller UI phase | Seller can upload? | Public badge |
|---------------|-----------------|--------------------|--------------|
| `none` | unverified | yes | no |
| `submitted` | documents_submitted | no | no |
| `in_review` | in_review | no | no |
| `verified` | verified | no | **yes** |
| `rejected` | rejected | yes (resubmit) | no |
| `revoked` | revoked | no | no |
| `expired` | expired | yes (resubmit) | no |

Flow: **unverified → documents_submitted → in_review → verified/rejected → (resubmit if rejected/expired)**.

Routes: `/{locale}/seller/listings/:id/verification` · Listing card link when `flags.verifiedOwnerEnabled=true`.

---

## 5. P3 ledger flip protocol (same PR or immediate follow-up)

1. Edit `apps/web/src/config/sell-privately/promises.json`: `P3.state` → `live`; bump `updatedAt`.
2. Update `apps/web/src/lib/sell-privately.spec.ts` expectations (P3 live).
3. Do **not** touch `blocks.savingsFigures` / `blocks.mediazioneCopy` or other promises.
4. Run: `pnpm lint`, `pnpm typecheck`, `pnpm test` (incl. `promiseLedger`, `check:counsel-copy`, T32 flag-matrix).
5. Merge + **rebuild web** on VPS (§2).

No-script smoke on `/it/vendi-da-privato`: P3 benefit tile shows `Attivo` / `Proprietario verificato` (IT copy).

---

## 6. Smoke checklist (after PK-1 flip)

- [ ] `GET /api/health` **200**
- [ ] `GET /api/seller/vo/:listingId` unauth → **401** (not 404)
- [ ] `GET /api/seller/checklist/:listingId` unauth → **401** (PK-2 still on)
- [ ] Authenticated seller: submit VO docs → state `submitted`
- [ ] Admin queue shows case; claim → verify → public listing shows verified badge
- [ ] Reject path: reason visible on seller verification page
- [ ] `company` / `partial` name-match rows still require manual decision (no auto-verify)
- [ ] Sell-privately P3 chip **live**; P6 checklist chip still **live**; Claim 1–2 unchanged
- [ ] Checklist-only sellers unaffected (VO optional)

---

## 7. Rollback

```bash
cd /opt/easycasa-ita
sed -i 's/^VERIFIED_OWNER_ENABLED=true/VERIFIED_OWNER_ENABLED=false/' .env
# Revert P3 ledger on main if flipped
docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env \
  build --no-cache web
docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env \
  up -d --no-deps --force-recreate web api
```

Verified cases remain in DB; badges hidden when flag off (API 404). No automatic doc purge on rollback.

---

## 8. Gaps — PP-6 UI vs admin queue vs preconditions

| Gap | Detail | Impact |
|-----|--------|--------|
| **No admin reject template picker** | `VoModeration.tsx` uses plain `<input>`; templates exist only in seller i18n + alias map | Reviewers will produce inconsistent seller messaging unless trained on canonical phrases |
| **No SLA / stall UX** | Seller sees `documents_submitted` with no countdown; no ops alert on queue depth | Backlog invisible to product until admin checks `#vo` |
| **Doc links open in new tab** | Uses `/api/media/file/{key}` — reviewer must be admin-authenticated | Broken link if session expired mid-review |
| **Company / partial match** | Admin shows advisory chip but no workflow branch | Moderator must manually decide; brief should not promise auto-routing |
| **VO + checklist independence** | Checklist live (PK-2) without VO | Sellers can upload private checklist docs without verified badge — intentional |
| **T05 retention checkboxes open** | §1 retention “proposed” not counsel-signed | Ops need written retention rule before bulk deletion |
| **Expire sweep** | System `EXPIRE` event exists in FSM | Confirm cron/sweep job enabled on VPS before promising 12m validity |

---

*Maintained by Cursor (K EC 1.52). Execute only after AZM go/no-go on moderation capacity.*
