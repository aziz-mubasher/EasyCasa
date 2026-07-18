# Core API (Phase 2)

NestJS + Drizzle over the Phase 1 Postgres schema. OpenAPI at `/docs`
(externally `/api/docs` behind Caddy).

## Auth
- Global `JwtAuthGuard` verifies OIDC bearer tokens via JWKS; `@Public()` opts out.
- Global `RolesGuard` enforces `@Roles(...)`; `admin` passes everything.
- Local dev: `DEV_AUTH=true`, then send headers:
  `x-dev-user: u1`, `x-dev-roles: agent`, `x-dev-email: a@b.it`.

## Endpoints
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | /listings | public | Search + filters + geo bounds (page/pageSize) |
| GET | /listings/:slug | public | Listing detail |
| POST | /listings | seller/agent/partner/pro | Create draft |
| PATCH | /listings/:id | owner/admin | Update |
| POST | /listings/:id/publish | owner/admin | Publish |
| GET | /categories, /regions | public | Taxonomy |
| GET | /me | authed | Current user (auto-provisioned) |
| GET | /agents/:slug | public | Agent profile |
| GET/POST/DELETE | /me/favorites[...] | authed | Favorites |
| GET/POST/PUT/DELETE | /me/saved-searches | authed | Saved searches + alert frequency (Phase 22) |

| POST | /media/presign | seller+ | Presigned MinIO upload URL |
| POST | /media/confirm | seller+ | Record uploaded media |
| GET | /admin/stats | admin | Listing counts by status |
| POST | /admin/listings/:id/archive | admin | Archive a listing |

## Geo search
`GET /listings?minLat&minLng&maxLat&maxLng` uses PostGIS
`ST_MakeEnvelope(...)::geography` against the GIST-indexed `location` column —
this powers the map "search this area". Scalar filters (price, bedrooms,
category/region slug, transaction type) combine with the bounds.

## Media flow (direct-to-MinIO)
1. `POST /media/presign` → `{ uploadUrl, key, publicUrl }`
2. Browser `PUT`s the file straight to MinIO (keeps large uploads off the API).
3. `POST /media/confirm` → inserts the `media` row at the next position.
