# Casafari share-link import

Import EasyCasa draft listings from a public Casafari **sharepage** URL
(same approach as Banks4All partners properties collection).

> **Access:** only Keycloak username **`muba-seller`** (API + `/add` UI). Sellers other
> than this account, and admins, are denied. `muba-seller` should hold the Keycloak
> **`seller`** role so create/publish works.
>
> **Legal note:** this reads embedded `"estates":[...]` JSON from the sharepage HTML.
> It is not the official Casafari Property Data API. Confirm ToS / counsel before
> production use at scale.

## UI

`/{locale}/add` — “Import from Casafari share link” panel (step 1), visible only to `muba-seller`:

1. Paste `https://www.casafari.com/estate/sharepage/{shareId}/…`
2. **Preview** → mapped draft(s), up to **20** photo URLs
3. **Apply to form** → fill the wizard for manual review, **or**
4. **Import as draft + photos** → create `listings` row (`source=casafari`) and
   download photos into EasyCasa media storage (Bunny/MinIO). If object upload
   fails, the remote CDN URL is stored so the draft still has images.

## API

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/imports/casafari/preview` | `muba-seller` only | Scrape → drafts (no DB write) |
| POST | `/imports/casafari/create` | `muba-seller` only | Create draft listing + import ≤20 photos |

### Preview / create body

```json
{ "url": "https://www.casafari.com/estate/sharepage/…", "maxImages": 20, "refreshCache": false }
```

`casafariId` is **required** on create when the share folder contains more than one estate.

## Code

- Access gate: `apps/api/src/imports/casafari/casafari-access.ts`
- Scrape: `apps/api/src/imports/casafari/casafari-scrape.ts`
- Taxonomy map: `apps/api/src/imports/casafari/casafari-map.ts`
- Service: `apps/api/src/imports/imports.service.ts`
- Web panel: `apps/web/src/components/add/CasafariImportPanel.tsx`
- Web gate: `apps/web/src/auth/useCanImportCasafari.ts`
