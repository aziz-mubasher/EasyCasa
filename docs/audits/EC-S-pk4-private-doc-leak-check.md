# EC-S PK-4 — private document leak check (2026-08-15)

**Why:** Confirm dual-store after CDN enablement — VO + checklist must not be CDN-public.  
**Artifact:** `/opt/cursor/artifacts/pk4_private_doc_leak_check.log` (`PK4_PRIVATE_DOC_LEAK_CHECK_PASS`)

## Live config

| Var | Value |
|-----|--------|
| `MEDIA_CDN_ENABLED` | `true` |
| `MEDIA_ORIGIN` | `bunny` |
| `BUNNY_CDN_BASE` | `https://easycasa1.b-cdn.net` |
| `MEDIA_PRIVATE_BASE` | `https://easycasaita.com/api/media/file` |

## Method

Ephemeral Keycloak seller → own listing →:

1. `POST /api/seller/vo/:id/submit` → `docKeys` under `users/…/docs/vo/…`  
2. `POST /api/seller/checklist/:id/docs` (APE) → key under `users/…/docs/checklist/…`  
3. Probe each key:
   - CDN `GET https://easycasa1.b-cdn.net/<key>` → must **not** be 200  
   - Unauth `GET /api/media/file/<key>` → **401**  
   - Auth owner `GET /api/media/file/<key>` → **200**  
4. `mc stat` on MinIO bucket → object present with `Cache-Control: private, no-store`

## Results

| Probe | VO | Checklist |
|-------|----|-----------|
| Upload | **201** | **201** |
| Key prefix | `users/…` | `users/…` |
| CDN GET | **404** | **404** |
| API unauth | **401** | **401** |
| API auth | **200** | **200** |
| MinIO object | **present** | **present** |

**Verdict:** Private documents stayed private — MinIO + authZ proxy; no CDN-public path.
