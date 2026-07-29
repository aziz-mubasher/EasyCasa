# Casafari share-link import

Import EasyCasa draft listings from a public Casafari **sharepage** URL
(same approach as Banks4All partners properties collection).

> **Legal note:** this reads embedded `"estates":[...]` JSON from the sharepage HTML.
> It is not the official Casafari Property Data API. Confirm ToS / counsel before
> production use at scale.

## UI

`/{locale}/add` — “Import from Casafari share link” panel (step 1):

1. Paste `https://www.casafari.com/estate/sharepage/{shareId}/…`
2. **Preview** → mapped draft(s), up to **10** photo URLs
3. **Apply to form** → fill the wizard for manual review, **or**
4. **Import as draft + photos** → create `listings` row (`source=casafari`) and
   download photos into EasyCasa media storage (Bunny/MinIO)

Select province on the form before import when possible (Casafari rarely sends it).

## API

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/imports/casafari/preview` | seller/agent/partner/pro/admin | Scrape → drafts (no DB write) |
| POST | `/imports/casafari/create` | seller/agent/partner/pro/admin | Create draft + import ≤10 images |

### Preview body

```json
{ "url": "https://www.casafari.com/estate/sharepage/…", "maxImages": 10, "refreshCache": false }
```

### Create body

```json
{
  "url": "https://www.casafari.com/estate/sharepage/…",
  "casafariId": "56860876461",
  "province": "BS",
  "maxImages": 10
}
```

`casafariId` is **required** when the share folder contains more than one estate.

### Mapped fields

| Casafari | EasyCasa |
|---|---|
| title / type / address | `title`, `address`, `city` |
| `salePrice` / `rentPrice` | `price`, `transactionTypes` |
| type / typeGroup | `propertyType`, `assetClass` |
| `conditionType` | `condition` (e.g. `to-refurbish` → `to_renovate`) |
| features `[1,2,3…]` | `features` (`balcony`, `garden`, …) |
| beds / baths / rooms / year / energy | matching columns |
| photos (selected portal group first) | media rows (transcoded WebP) |
| seller / portal | `sellerType`, `attributes.listingSource` |

Provenance is stored on `listings.attributes` (`casafariId`, share URL, portal URLs)
and `listings.source = 'casafari'`.

## Code

- Scrape: `apps/api/src/imports/casafari/casafari-scrape.ts`
- Taxonomy map: `apps/api/src/imports/casafari/casafari-map.ts`
- Service: `apps/api/src/imports/imports.service.ts`
- Web panel: `apps/web/src/components/add/CasafariImportPanel.tsx`

## Test link (manual)

```
https://www.casafari.com/estate/sharepage/6a6a1653c4200f82934f4357/80176180395
```

Expected: country house in Torbole Casaglia, €200 000, energy G, year 1967,
features garden/garage/parking/terrace/elevator, ≥10 photos from Tecnocasa CDN.
