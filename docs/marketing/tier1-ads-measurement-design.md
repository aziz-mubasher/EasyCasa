# Tier 1 — advertising measurement (design only)

No code in this document is to be built until every item below is done. The flag stays `MARKETING_TRACKING_ENABLED=false`.

Tier 0 (first-party, cookieless, aggregated) is the only measurement that ships with EC-ANALYTICS-1, and it ships with both web and API flags off.

## Before any pixel or tag

- A banner that meets the Garante cookie guidelines of 10 June 2021 (provv. 231): closing the banner is a rejection; Accept and Reject are equally prominent; purposes are granular; scrolling is not consent; the question is not asked again for at least 6 months unless something changes; consent is logged with the policy version.
- Ideally self-hosted, so nothing from an ad platform loads before consent.
- Google Consent Mode v2 wired to that banner.
- Meta Conversions API / Enhanced Conversions sending hashed identifiers only for people who opted in to marketing.
- Joint-controller terms with Meta (CJEU C-40/17 *Fashion ID*).
- Reliance on the EU-US Data Privacy Framework documented, including the pending appeal C-703/25 P.
- Privacy notice updated.
- Counsel sign-off.

## Flag plan

`MARKETING_TRACKING_ENABLED=false` until that list is complete. It is independent of `WEB_ANALYTICS_ENABLED`. Turning Tier 0 on does not turn Tier 1 on.

Suggested trigger, for AZM, not a decision taken here: paid spend above roughly €1,500 per month sustained, and a CPL goal that platform optimisers are needed to hit.

## What Tier 1 would add, later

Retargeting audiences, platform conversion optimisation, cross-day attribution. It requires the banner and accepts the measured-traffic loss from refusals.
