# EasyCasa API overlays

Prod API occasionally runs **committed overlay images** (`easycasa-ita-api:overlay-…`) instead of a fresh GitHub build. Use the scripts under `scripts/`:

| Script | Purpose |
|--------|---------|
| `easycasa-api-overlay-snapshot.sh` | `docker commit` running API → tagged overlay + keeper |
| `easycasa-api-overlay-recreate.sh` | Recreate API from overlay image override (never `:latest`) |
| `easycasa-overlay-extract.sh` | Read-only copy of live overlay sources out of containers |

Compose override example: `infra/docker-compose.api-overlay-image.yml`.

**Do not** compose-up or force-recreate prod from this branch without an explicit deploy request.
