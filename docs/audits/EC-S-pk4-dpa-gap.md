# EC-S PK-4 — Bunny DPA gap decision packet (2026-08-15)

**Status:** **CLOSED — Option 1 complete** (AZM 2026-08-15). Executed Bunny DPA cited; CDN stays live (`MEDIA_CDN_ENABLED=true`).  
**Citation:** `docs/legal/vendors/bunny-dpa-citation.md`  
**PDF:** `docs/legal/vendors/bunny-dpa-2026-08-15.pdf` (Mundida ↔ BunnyWay; processing from **15 Aug 2026**)  
**Related:** PK-4 CDN ops-live; private-doc leak check PASS (`docs/audits/EC-S-pk4-private-doc-leak-check.md`)  
**Supersedes:** residual-risk acceptance as the standing close path — DPA is now evidenced.

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
| **Erasure today** | App deletes DB `media` row + MinIO object; **no Bunny Storage purge API wired** — CDN objects may persist until manual zone purge or TTL (eng follow-up; not a DPA cite blocker) |

---

## (b) Three options — outcome

| Option | Result |
|--------|--------|
| **1 — Cite countersigned Bunny DPA** | **CHOSEN + COMPLETE** |
| 2 — Roll back CDN | Not taken |
| 3 — Residual-risk with expiry | Superseded by Option 1 cite |

---

## (c) Bunny DPA — execution evidence

| Question | Answer |
|----------|--------|
| Does Bunny publish a standard DPA? | **Yes** — `https://dash.bunny.net/account/dpa` |
| Is EasyCasa / Mundida DPA executed? | **YES** — PDF export dated **15 Aug 2026** |
| Controller | Mundida, Piazza Roma 8, 25030 Torbole Casaglia, Italy |
| Processor | BunnyWay, informacijske storitve d.o.o. |
| Processing start (DPA §2) | **15 Aug 2026** |
| Repo path | `docs/legal/vendors/bunny-dpa-2026-08-15.pdf` |
| SHA-256 | `c391dea4c9f4f004f5e394f455c7309fa122d76e987958f9eb3904dafd558b10` |
| T05 §4 | **☑** |

---

## Decision record

| Field | Value |
|-------|-------|
| Chosen option | **1 — Cite countersigned Bunny DPA** |
| Decided by | **AZM** |
| Date | **2026-08-15** |
| DPA doc id / path | `docs/legal/vendors/bunny-dpa-2026-08-15.pdf` · citation `docs/legal/vendors/bunny-dpa-citation.md` |
| Residual-risk expiry | n/a |
| Follow-up owner | Eng optional: wire Bunny purge on listing erase |

**CDN action:** none (Option 1 keeps `MEDIA_CDN_ENABLED=true`).

---

*Packet closed 2026-08-15 after AZM uploaded executed DPA PDF.*
