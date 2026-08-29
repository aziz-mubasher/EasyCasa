# Legenda venture repo — transfer status

**Target:** https://github.com/aziz-mubasher/legenda  
**Source:** EasyCasa `cursor/ec-rename-legenda-2145` (EC-RENAME-2)  
**Date:** 2026-08-27

## Blocker

Cloud agent **cannot see or push** to `aziz-mubasher/legenda` (API 404 / GitHub App not installed on that repo). Extract is ready locally and as artifacts:

- Git bundle: `/opt/cursor/artifacts/legenda-initial.bundle`
- Tarball: `/opt/cursor/artifacts/legenda-extract.tar.gz`
- Local path (this VM): `/opt/cursor/legenda-extract/legenda` (commit `5852f04`)

## AZM unblock

1. Create `aziz-mubasher/legenda` if missing (empty `main` OK).
2. Install **Cursor GitHub App** on that repo (Contents + PRs write).
3. Reply in the agent chat — agent will `git push` the extract.
4. Or push manually from the bundle:
   ```bash
   git clone legenda-initial.bundle legenda
   cd legenda
   git remote add origin https://github.com/aziz-mubasher/legenda.git
   git push -u origin main
   ```

## What the extract contains

Web `/aste` surfaces, Nest `aste` module, AI `/aste` routers, migrations, Legenda SSOT (`@legenda/shared`). Nest/Next host cutover, auth, Stripe, OMI remain follow-ups. Production stays on `easycasaita.com/aste` until cutover.

## Relation to PR #186

EC-RENAME-2 (Legenda naming inside EasyCasa) stays valid for the EasyCasa-hosted surface until DNS/cutover. Venture repo is the long-term home.
