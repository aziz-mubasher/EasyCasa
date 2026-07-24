# SmartLink (K EC 1.29)

Shareable branded public property pages with view tracking.

## Public route

- Web: `/{locale}/s/{token}` (e.g. `/it/s/Ab3x…`)
- API payload: `GET /share/{token}` (`@Public`)
- View beacon: `POST /share/{token}/view` with `{ visitorToken }` from httpOnly-safe cookie `ec_sl_vid` (set client-side; only a hash is stored server-side)

## Authenticated APIs

- `POST /listings/{listingId}/share-links` — create (owner/agent)
- `GET /me/share-links?listingId=` — list + stats
- `POST /share-links/{id}/revoke` — revoke (410 on public access)

## Migration

- `migration/sql/0027_share_links.sql`

## Privacy

See `docs/legal/COUNSEL-REVIEW-PACKAGE.md` §1.1 (SmartLink view tracking) and PR description for DPO headline.
