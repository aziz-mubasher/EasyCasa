# EC-S PK-4 — Bunny DPA gap decision packet (2026-08-15)

**Status:** **OPEN** — listing photos (personal data in context) are served from `https://easycasa1.b-cdn.net` while **no executed Bunny DPA is cited** in repo counsel records.  
**Related:** PK-4 CDN ops-live (`MEDIA_CDN_ENABLED=true`); private-doc leak check PASS (`docs/audits/EC-S-pk4-private-doc-leak-check.md`)  
**Supersedes:** prior “CLOSED via residual-risk acceptance” wording — product-owner proceed is **not** DPA evidence (§C.14 / standing rules).

---

## (a) Scope of processing — quantified

| Dimension | Production evidence (VPS DB + container, 2026-08-15) |
|-----------|--------------------------------------------------------|
| **Personal data categories** | Listing photographs (may show interiors, people, address context); derived WebP masters; content-addressed URLs tied to `listings.id` and seller accounts |
| **Objects on Bunny Pull Zone** | **588** rows in `media` with `url LIKE '%easycasa1.b-cdn.net/listings/%'` |
| **Total media rows** | **589** (588 CDN + legacy/minio) |
| **CDN URL date span** | `created_at` **2026-07-24** → **2026-07-29** (objects predated PK-4 flag flip; flag enabled 2026-08-15) |
| **Processing activity** | Storage + global edge delivery of listing images uploaded via `POST /api/media/upload` |
| **Private docs excluded** | VO/checklist `users/…/docs/…` remain on MinIO / `MEDIA_PRIVATE_BASE` API proxy (PK-4 eng) |
| **Sub-processors** | Bunny.net edge + storage; see Bunny published list at `https://bunny.net/gdpr/sub-processors/` |
| **Erasure today** | App deletes DB `media` row + MinIO object; **no Bunny Storage purge API wired** — CDN objects may persist until manual zone purge or TTL |

---

## (b) Three options — precise steps

### Option 1 — Cite countersigned Bunny DPA (preferred)

1. Log in to Bunny dashboard → **Account → DPA** (`https://dash.bunny.net/account/dpa`).
2. Review pre-filled DPA → **Accept** → **Download** signed PDF/JSON export.
3. Store in counsel vault (path TBD — e.g. `docs/legal/vendors/bunny-dpa-YYYY-MM-DD.pdf`, git-ignored if sensitive).
4. Record in repo: doc id, acceptance date, signatory, storage path (redacted public pointer OK).
5. Tick T05 §4 checkbox with citation — **no CDN flip required** (already live).

**Rollback risk:** none if DPA acceptable.

### Option 2 — Roll back CDN (`MEDIA_CDN_ENABLED=false`)

```bash
cd /opt/easycasa-ita
grep -E '^MEDIA_CDN_ENABLED=' .env
sed -i 's/^MEDIA_CDN_ENABLED=.*/MEDIA_CDN_ENABLED=false/' .env
docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env \
  up -d --no-deps --force-recreate api
docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env \
  exec -T api printenv MEDIA_CDN_ENABLED MEDIA_ORIGIN
```

**Effect:** New listing uploads fall back to MinIO (`object-storage.ts` gate). Existing **588** CDN URLs in DB **remain** until media migration/re-upload — plan a backfill or accept mixed delivery during transition.

**Verify:**

```bash
curl -fsS -o /dev/null -w '%{http_code}\n' 'https://easycasa1.b-cdn.net/listings/<sample>.webp'
# Auth upload smoke → URL should NOT be on b-cdn.net when flag off
```

### Option 3 — Written residual-risk acceptance with close-by date

1. AZM signs a one-page record: CDN stays live until **YYYY-MM-DD**; DPA pursuit owner; max exposure (588 objects, listing photos only).
2. File under `docs/legal/` or audit trail (like PK-7 residual pattern) with **explicit expiry**.
3. T05 §4 stays **☐** until Option 1 completes.
4. Calendar reminder before expiry → force Option 1 or Option 2.

**This agent does not execute Option 3** — AZM only.

---

## (c) Bunny standard DPA — publication & execution

| Question | Answer |
|----------|--------|
| Does Bunny publish a standard DPA? | **Yes** — account DPA available at `https://dash.bunny.net/account/dpa` (docs: `https://bunny.net/docs/account/data-processing-agreement`) |
| Is EasyCasa’s DPA executed? | **UNVERIFIED** — requires Bunny dashboard access; not evidenced in repo |
| Counterparty | BunnyWay d.o.o. (per public DPA template v2, Jul 2024) |
| Execution mechanism | Click **Accept** in dashboard; download signed copy post-acceptance |

---

## (d) GDPR erasure implications

| Path | Today |
|------|-------|
| Seller/listing erasure (DSAR) | App logic deletes `media` rows + MinIO keys for private docs |
| Bunny CDN copy | **Not automatically purged** — no `bunnyHttpDelete` wired for listing masters on erasure (purge API exists for eng follow-up) |
| Risk | Residual photos on edge cache / storage until manual purge or zone lifecycle |
| Mitigation options | Wire purge on listing delete; document residual retention in ROPA; or roll back CDN (Option 2) |

---

## Decision record (blank — AZM fill)

| Field | Value |
|-------|-------|
| Chosen option | _1 / 2 / 3_ |
| Decided by | _AZM_ |
| Date | _YYYY-MM-DD_ |
| DPA doc id / path | _if Option 1_ |
| Residual-risk expiry | _if Option 3_ |
| Follow-up owner | _name_ |

---

*Packet produced by K EC 1.56 close-out. No `MEDIA_CDN_ENABLED` change in this task.*
