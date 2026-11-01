<!-- COUNSEL REVIEW PENDING — draft LIA, not legal advice -->

# Legitimate-interest assessment — Tier 0 audience measurement

**Controller (as already stated in the draft privacy notice):** MUNDIDA S.r.l., operating EasyCasa.  
**Processing:** transient read of IP address and User-Agent in memory, then a daily salted hash and aggregated counters.  
**Legal basis claimed:** GDPR art. 6(1)(f).  
**Status:** engineering draft. Counsel has not signed this.

## Purpose

Produce aggregated statistics for one site: which channels, campaigns, pages, languages and funnels are associated with visits and with a closed list of conversions. The figures support decisions about listings and paid services. They are not used to identify a person, to build a profile across days, or to feed an advertising platform.

## Necessity

The same decisions cannot be made from server logs that keep full addresses, and they cannot be made if every visit is dropped. The design keeps the minimum that still answers the four questions in the measurement brief: channel, funnel step, page template, locale.

## Data

Read in memory only, then discarded: full IP, truncated IP, full User-Agent.  
Stored: page template, locale, listing UUID on listing-detail templates only, referrer host, cleaned UTM parameters, a paid-click presence flag (never the click id), device class, browser family, OS family, a country inferred from the browser time zone, a screen-width band, foreground milliseconds, scroll step, allow-listed event name and allow-listed props, and a 16-byte hash.

Not stored: cookie or device id, user id, email, phone, name, enquiry text, query strings other than UTM parameters, click-id values, canvas or font fingerprints.

Visitors who send `Sec-GPC: 1` or `DNT: 1` are not stored (`ANALYTICS_HONOR_GPC`, default true). Staff who carry `ec_staff=1` are not stored.

## Identifying power

The hash is `SHA-256(salt_of_the_Rome_day ‖ site ‖ IPv4/24 or IPv6/48 ‖ browser family and major version ‖ primary Accept-Language)`, truncated to 16 bytes. The salt is 32 random bytes, stored for that Rome calendar day only, and deleted at 03:30 Europe/Rome so that yesterday's hashes cannot be recomputed. Raw rows are deleted after 30 days. Rollups have no hash column.

## Balancing

Interest: operating a single property site and seeing, in aggregate, whether a campaign or a page produces enquiries and listing submissions.

Impact on the visitor: no cookie, no persistent identifier, no third party, no join to accounts, no cross-day journey, opt-out via GPC/DNT, disclosure in the privacy notice.

The interest is not overridden by the visitor's interests or rights under this design, subject to counsel confirming the art. 122 qualification. If counsel disagrees, the flags stay off.

## Safeguards

Collector answers 204 and echoes nothing. IP and User-Agent are not logged. Throttle key is the truncated address and is not logged. Schema rejects columns whose names contain ip, user, email, phone or ua. No third-party request is added by the beacon.

## Hosting

Public A record of easycasaita.com on 1 November 2026 geolocated to Frankfurt am Main, Hesse, Germany (Hostinger). The hosting contract prevails if the data centre moves.
