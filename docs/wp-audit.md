# WordPress Audit (do this BEFORE running the ETL)

The ETL maps plugin-specific data. These values differ by real-estate plugin,
so discover them against the real database and update `migration/src/etl/meta-map.ts`
and `WP_LISTING_POST_TYPE` / `WP_PERMALINK_BASE` in `.env`.

## 1. Find the listing post type
```sql
SELECT post_type, COUNT(*) FROM wp_posts GROUP BY post_type ORDER BY 2 DESC;
```
Set `WP_LISTING_POST_TYPE` to the custom type (e.g. `estate_property`, `property`, `houzez_property`).

## 2. Discover the meta keys used by listings
```sql
SELECT pm.meta_key, COUNT(*) c
FROM wp_postmeta pm
JOIN wp_posts p ON p.ID = pm.post_id
WHERE p.post_type = '<your_listing_post_type>'
GROUP BY pm.meta_key
ORDER BY c DESC
LIMIT 100;
```
Map price / bedrooms / bathrooms / size / lat / lng / gallery etc. into `META` in `meta-map.ts`.

## 3. Inspect a sample listing end-to-end
```sql
SELECT meta_key, LEFT(meta_value,120)
FROM wp_postmeta WHERE post_id = <some_listing_id> ORDER BY meta_key;
```

## 4. Taxonomies (categories + regions)
```sql
SELECT tt.taxonomy, t.name, t.slug, tt.count
FROM wp_term_taxonomy tt JOIN wp_terms t ON t.term_id = tt.term_id
ORDER BY tt.taxonomy, tt.count DESC;
```
Note the taxonomy names for property category and region so we can join
`wp_term_relationships` and populate `category_id` / `region_id`.

## 5. Permalink structure
Check **Settings → Permalinks** (or `wp_options.permalink_structure`) and set
`WP_PERMALINK_BASE` so the redirect map produces correct old URLs.

## 6. Gallery storage
Find how images are stored (serialized IDs, JSON, or attachment children):
```sql
SELECT meta_value FROM wp_postmeta WHERE post_id=<id> AND meta_key='<gallery_key>';
```
Adjust `pendingMedia()` in `migration/src/media.ts` accordingly.
