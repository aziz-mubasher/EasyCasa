# Valutazione gratuita (seller LP)

Standalone marketing page for free OMI-based home valuation aimed at sellers.

## Route

- `/{locale}/valutazione-gratuita` — EN / IT / ES via next-intl
- Source design: `EC Startup /lp-valutazione-gratuita.html` (copy in `docs/lp-valutazione-gratuita.html`)

## Chrome

- Minimal masthead (brand + locale) — `isMarketingServicePath`
- App footer hidden on this route; page ships its own mono footer
- Linked from the main app footer on other pages

## Form

Hero form collects address, commercial m², and condition. Live address→microzone OMI calculation is not wired yet; submit shows an honest next-step CTA to `/add` (list without seller commission). Example OMI band on the page is labelled as an example.

## Counsel note

Commercial reuse of OMI data remains a counsel item (same as EC-7 valuation flag).
