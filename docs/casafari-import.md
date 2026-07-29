# Casafari share-link import

Import EasyCasa draft listings from a public Casafari **sharepage** URL
(same approach as Banks4All partners properties collection).

> **Access:** Keycloak **`admin`** role (API + UI). Allowlisted importer usernames
> also work for publish workflows; the UI only says “reserved for admin use”.
>
> **Legal note:** this reads embedded `"estates":[...]` JSON from the sharepage HTML.
> It is not the official Casafari Property Data API. Confirm ToS / counsel before
> production use at scale.

## UI

Primary surface: **`/{locale}/imports/casafari`** (nav link “Casafari import” for allowed users).

1. Paste a folder or single-estate URL, e.g.
   `https://www.casafari.com/estate/sharepage/6a6a15cb065342a49f9fe5b7`
2. **Preview folder** → all estates listed with checkboxes (all selected by default)
3. Optionally set province sigla (applied to every draft)
4. **Import N as drafts** → creates one `listings` row per selected estate
   (`source=casafari`, status `draft`) and downloads ≤20 photos each

`/{locale}/add` links to this page for allowed users (manual listing wizard unchanged).

## API

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/imports/casafari/preview` | admin (or allowlisted) | Scrape → drafts (no DB write) |
| POST | `/imports/casafari/create` | admin (or allowlisted) | Create one draft + ≤20 photos |
| POST | `/imports/casafari/create-many` | admin (or allowlisted) | Create many drafts from a folder |

### Preview / create body

```json
{ "url": "https://www.casafari.com/estate/sharepage/…", "maxImages": 20, "refreshCache": false }
```

`casafariId` is **required** on `/create` when the share folder contains more than one estate.

### Create-many body

```json
{
  "url": "https://www.casafari.com/estate/sharepage/…",
  "casafariIds": ["8017…", "8017…"],
  "maxImages": 20,
  "province": "BS",
  "refreshCache": true
}
```

Omit or empty `casafariIds` → import every estate on the share.

## Code

- Access gate: `apps/api/src/imports/casafari/casafari-access.ts`
- Scrape: `apps/api/src/imports/casafari/casafari-scrape.ts`
- Taxonomy map: `apps/api/src/imports/casafari/casafari-map.ts`
- Service: `apps/api/src/imports/imports.service.ts`
- Web page: `apps/web/app/[locale]/imports/casafari/page.tsx`
- Web UI: `apps/web/src/components/imports/CasafariFolderImport.tsx`
- Web gate: `apps/web/src/auth/useCanImportCasafari.ts`
