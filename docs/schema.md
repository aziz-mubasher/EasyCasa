# Data Schema (Phase 1)

Source of truth is **PostgreSQL** with three capabilities in one database:
PostGIS (geo), pgvector (embeddings), pg_trgm/unaccent (fuzzy text).
Migrations live in `migration/sql/` and are applied by `pnpm --filter @easycasa/migration migrate`.

## ERD

```mermaid
erDiagram
    USERS ||--o{ LISTINGS : "agent_id"
    USERS ||--o{ MEMBERSHIPS : ""
    CATEGORIES ||--o{ LISTINGS : "category_id"
    REGIONS ||--o{ LISTINGS : "region_id"
    LISTINGS ||--o{ MEDIA : "listing_id"

    USERS { uuid id PK; bigint wp_user_id UK; text email; user_role role }
    CATEGORIES { uuid id PK; text key UK; text slug UK }
    REGIONS { uuid id PK; text slug UK; geography boundary }
    LISTINGS {
      uuid id PK; bigint wp_post_id UK; text slug UK; listing_status status;
      transaction_type transaction_type; numeric price; geography location;
      vector embedding; jsonb attributes; text[] features
    }
    MEDIA { uuid id PK; uuid listing_id FK; text url; text original_wp_url UK }
    MEMBERSHIPS { uuid id PK; uuid user_id FK; text tier; text status }
    CONTENT { uuid id PK; bigint wp_post_id UK; content_type type; text slug }
    REDIRECTS { uuid id PK; text old_path UK; text new_path; int status_code }
    GEOCODE_CACHE { uuid id PK; text query UK; float latitude; float longitude }
```

## Idempotency strategy
Every migrated entity carries its WordPress key as a UNIQUE column
(`wp_post_id`, `wp_user_id`, `original_wp_url`, `content.wp_post_id`).
All loads use `INSERT ... ON CONFLICT (<wp_key>) DO UPDATE`, so the ETL is
**safe to re-run** any number of times without duplicating data.

## Key design notes
- `listings.location geography(Point,4326)` — kept in sync with `latitude/longitude`
  via `ST_MakePoint`; GIST-indexed for radius/bounds queries.
- `listings.embedding vector(1536)` — column exists now; populated in Phase 4.
  HNSW index is added then (commented in `0003_indexes_seed.sql`).
- `attributes jsonb` + `features text[]` — flexible now, normalise later if needed.
- Enums (`listing_status`, `transaction_type`, etc.) created idempotently.
- Categories and the 20 Italian regions are **seeded** in `0003_indexes_seed.sql`.

## Field dictionary (listings, selected)
| Column | Type | Notes |
|---|---|---|
| price | numeric(14,2) | parsed from messy WP strings by `transform.ts` |
| bedrooms/bathrooms/rooms | int | best-effort parse |
| size_sqm / land_sqm | numeric | square metres |
| energy_class | text | APE class (A4..G) |
| transaction_type | enum | sale/rent, normalised from plugin text |
| location | geography | set from coords or geocoding |
| embedding | vector(1536) | Phase 4 |
| status | enum | draft/published/sold/archived |
