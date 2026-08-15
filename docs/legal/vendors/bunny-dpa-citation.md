# Bunny.net DPA — Option 1 citation record

**Decision:** AZM chose **Option 1 — Cite countersigned Bunny DPA** (2026-08-15).  
**CDN:** stays live (`MEDIA_CDN_ENABLED=true`) — no rollback.  
**Parent packet:** `docs/audits/EC-S-pk4-dpa-gap.md`

## Execution status

| Step | Status |
|------|--------|
| AZM selects Option 1 | **DONE** 2026-08-15 |
| Accept DPA in Bunny dashboard (`https://dash.bunny.net/account/dpa`) | **PENDING AZM** — agent has Storage Zone keys only, no account login |
| Download signed PDF/JSON | **PENDING** |
| Store in counsel vault | **PENDING** — suggested path `docs/legal/vendors/bunny-dpa-YYYY-MM-DD.pdf` (git-ignore if sensitive) |
| Cite doc id + date + signatory in this file | **PENDING** |
| Tick T05 §4 in `docs/legal/ec-s-t05-seller-data-memo.md` | **BLOCKED** until citation filled |

## Citation (fill after Accept)

| Field | Value |
|-------|-------|
| Processor | BunnyWay d.o.o. / Bunny.net |
| DPA type | Standard account DPA (dashboard Accept) |
| Acceptance date | _YYYY-MM-DD_ |
| Signatory | _name / role_ |
| Doc id / export name | _from Bunny download_ |
| Storage path | _vault or `docs/legal/vendors/…`_ |
| Live CDN host | `easycasa1.b-cdn.net` (~588 listing photo URLs) |
| Private docs | Remain MinIO / API proxy (unchanged) |

## Standing rule

Product-owner “proceed” is **not** DPA evidence. Do **not** mark T05 §4 ☑ until the citation table above is complete.

## Next human action

1. Log in to Bunny → Account → DPA → **Accept** → **Download**.
2. Reply with acceptance date + file path (or drop the PDF into the vault / attach for Cursor).
3. Cursor will complete citation + tick T05 §4 + close the DPA gap packet.
