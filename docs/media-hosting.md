# Media hosting — Bunny Storage + Pull Zone (pilot)

**Status:** Listing uploads validate/strip EXIF and write content-addressed WebP
masters. Origin is selectable via env (`minio` default, `bunny` for production CDN).

## Architecture (pilot)

```
browser → POST /api/media/upload (Nest)
       → sharp: sniff, EXIF strip, ≤2560px, WebP
       → PUT object to Storage Zone (S3 API)
       → DB media.url = https://cdn.easycasaita.com/listings/{id}/{hash}.webp
       → browser loads from Pull Zone
```

Private fascicolo docs (`users/…`) keep `MEDIA_PRIVATE_BASE` (API proxy), even when
listing images use the CDN.

## Env vars

| Variable | Purpose |
|---|---|
| `MEDIA_ORIGIN` | `minio` (default) or `bunny` |
| `BUNNY_STORAGE_ZONE` | Storage zone name (= S3 access key id + bucket), e.g. `easycasaita` |
| `BUNNY_STORAGE_PASSWORD` | Storage zone access key / FTP password (**rotate if ever pasted in chat**) |
| `BUNNY_STORAGE_ENDPOINT` | Default `https://storage.bunnycdn.com` (use regional host if Bunny shows one) |
| `BUNNY_S3_REGION` | Zone region hint, e.g. `de` / `uk` |
| `BUNNY_CDN_BASE` | Pull Zone URL, e.g. `https://cdn.easycasaita.com` |
| `MEDIA_PUBLIC_BASE` | Fallback listing URL base (MinIO proxy or CDN) |
| `MEDIA_PRIVATE_BASE` | Optional; empty + `bunny` → `https://easycasaita.com/api/media/file` |

MinIO vars (`S3_ENDPOINT`, `MINIO_*`) stay for local/dev and as fallback.

## VPS switch-on (after you rotate the password)

1. **Rotate** the Storage Zone password in Bunny dashboard (old key was exposed in chat).

2. **Confirm Pull Zone**
   - Hostname `cdn.easycasaita.com` is linked and DNS CNAME points at Bunny.
   - Origin of the Pull Zone = Storage Zone `easycasaita` (not MinIO).
   - Optimizer: recommended ON; whitelist widths later.

3. **Edit `/opt/easycasa-ita/.env`** on the VPS (never commit):

```bash
ssh banks4all-vps
cd /opt/easycasa-ita
nano .env
```

Set:

```env
MEDIA_ORIGIN=bunny
BUNNY_STORAGE_ZONE=easycasaita
BUNNY_STORAGE_PASSWORD=<rotated-password-here>
BUNNY_STORAGE_ENDPOINT=https://storage.bunnycdn.com
BUNNY_S3_REGION=de
BUNNY_CDN_BASE=https://cdn.easycasaita.com
MEDIA_PUBLIC_BASE=https://cdn.easycasaita.com
MEDIA_PRIVATE_BASE=https://easycasaita.com/api/media/file
```

Leave MinIO vars as-is (compose still runs MinIO for local/dev paths).

4. **Redeploy API** so it reloads env:

```bash
cd /opt/easycasa-ita
git pull origin main
./infra/deploy.sh
# or faster if only env changed:
# docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env up -d api
```

5. **Smoke test**
   - Upload a listing photo via `/it/add`.
   - Confirm `media.url` in DB starts with `https://cdn.easycasaita.com/listings/…`.
   - Open that URL in a browser — image loads from CDN.
   - Confirm EXIF is gone (re-encoded WebP).

6. **Rollback** — set `MEDIA_ORIGIN=minio` and
   `MEDIA_PUBLIC_BASE=https://easycasaita.com/api/media/file`, then restart `api`.

## Not done yet (next)

- CDN purge on delete / GDPR erasure (needs Bunny account API key + Pull Zone id `6235237`).
- Bunny Optimizer width whitelist.
- Separate private zone / token auth for documents (pilot keeps them on the API proxy path).
