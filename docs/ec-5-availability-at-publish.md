# EC-5 — Availability at publish

## Step 0
```
0031, 0032, 0033 (next would be 0034 — no migration in this task)
publish UI: apps/web/app/[locale]/add/page.tsx
availability: viewings API + shared generateSlots
```

## Behaviour
- Wizard step 5: optional weekly windows (defaults Mon–Fri 18–20, Sat 10–13), pre-ticked.
- Order: `POST /listings` → `POST …/availability` → media → `POST …/publish`.
- Live preview uses shared `generateSlots` (same as API).
- Post-publish edit: `/listings/[slug]/availability`.
- Product analytics sink: `listing.availability_*`, `viewing.picker_*`, `viewing.requested`.

## Note
`GET /listings/:id/availability` added so the edit screen can load windows (POST alone is not enough). Not a new scheduling invent; completes the existing resource.
