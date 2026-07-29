# Valutazione gratuita (seller LP)

Standalone marketing page for free OMI-based home valuation aimed at sellers.

## Route

- `/{locale}/valutazione-gratuita` — EN / IT / ES via next-intl
- Source design: `EC Startup /lp-valutazione-gratuita.html` (V1) and `lp-valutazione-gratuita V2.html` (footer pattern)
- Copies: `docs/lp-valutazione-gratuita.html`, `docs/lp-valutazione-gratuita-v2.html`

## Chrome

- Uses the main site header and V2 ink site footer (not marketing chrome). Only `/acquisto-assistito` uses `isMarketingServicePath`. Listing landings still hide the site footer.
- Linked from the site footer (“Per chi vende”)

## Form

Hero form collects address, commercial m², and condition. Live address→microzone OMI calculation is not wired yet; submit shows an honest next-step CTA to `/add`.

## Counsel note

Commercial reuse of OMI data remains a counsel item (same as EC-7 valuation flag).
