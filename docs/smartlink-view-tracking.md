# SmartLink view tracking (K EC 1.29) — DPO review

## Purpose

Count total and unique views of public SmartLink pages (`/s/{token}`) for listing owners/agents. No login required to view the page.

## Data stored

| Field / table | Content | Retention |
|---|---|---|
| `share_links.view_count` | Aggregate integer, incremented on each recorded view | Life of share link row |
| `share_links.unique_view_count` | Aggregate integer, incremented at most once per visitor per UTC day | Life of share link row |
| `share_links.last_viewed_at` | Timestamp of last recorded view | Life of share link row |
| `share_link_view_dedup` | `(share_link_id, view_date, visitor_hash)` | Rows with `view_date` older than 400 days SHOULD be purged by a future retention job (not automated in v1) |

## What we do **not** store

- Raw IP addresses
- User-Agent strings
- Cookie values or client-generated visitor IDs (only a one-way hash)
- Identity-linked device fingerprints

## Uniqueness mechanism

1. The browser holds a first-party cookie `ec_sl_vid` (random UUID, no PII).
2. On each public page load, the web app sends header `X-EC-SL-Visitor` with that opaque value to `GET /share-links/public/:token`.
3. The API computes  
   `visitor_hash = SHA-256( SHARE_VIEW_HMAC_SECRET ‖ share_link_id ‖ YYYY-MM-DD UTC ‖ SHA-256(opaque_visitor_id) )`.
4. `view_count` always increments.
5. If inserting `(share_link_id, view_date, visitor_hash)` into `share_link_view_dedup` succeeds, `unique_view_count` increments.

Rotating the daily `view_date` bucket limits how long a hash remains linkable across days. Rotating `SHARE_VIEW_HMAC_SECRET` invalidates historical dedup rows (acceptable for analytics).

## Legal / product flags

- New processing on a public page — add to counsel package (PR #29) alongside OMI CC BY question.
- Policy v1-draft; lawful basis for owner-facing analytics likely legitimate interest — **requires counsel sign-off**.
