import type { PoolClient } from 'pg';
import type { ListingRow, UserRow } from './transform.js';

/** UPSERT a user by wp_user_id (idempotent). Returns internal uuid. */
export async function upsertUser(client: PoolClient, u: UserRow): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO users (wp_user_id, email, display_name, slug, role)
     VALUES ($1,$2,$3,$4,'agent')
     ON CONFLICT (wp_user_id) DO UPDATE
        SET email = EXCLUDED.email,
            display_name = EXCLUDED.display_name,
            slug = EXCLUDED.slug,
            updated_at = now()
     RETURNING id`,
    [u.wp_user_id, u.email, u.display_name, u.slug],
  );
  return rows[0].id;
}

/** UPSERT a listing by wp_post_id (idempotent). Returns internal uuid. */
export async function upsertListing(
  client: PoolClient,
  l: ListingRow,
  agentId: string | null,
): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO listings (
        wp_post_id, slug, title, description, status, transaction_type, price,
        bedrooms, bathrooms, rooms, size_sqm, land_sqm, floor, year_built,
        energy_class, condition, address, city, province, postal_code,
        latitude, longitude, qr_code_url, agent_id, published_at, source
     ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,'wordpress'
     )
     ON CONFLICT (wp_post_id) DO UPDATE SET
        slug = EXCLUDED.slug, title = EXCLUDED.title, description = EXCLUDED.description,
        status = EXCLUDED.status, transaction_type = EXCLUDED.transaction_type,
        price = EXCLUDED.price, bedrooms = EXCLUDED.bedrooms, bathrooms = EXCLUDED.bathrooms,
        rooms = EXCLUDED.rooms, size_sqm = EXCLUDED.size_sqm, land_sqm = EXCLUDED.land_sqm,
        floor = EXCLUDED.floor, year_built = EXCLUDED.year_built,
        energy_class = EXCLUDED.energy_class, condition = EXCLUDED.condition,
        address = EXCLUDED.address, city = EXCLUDED.city, province = EXCLUDED.province,
        postal_code = EXCLUDED.postal_code, latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude, qr_code_url = EXCLUDED.qr_code_url,
        agent_id = EXCLUDED.agent_id, published_at = EXCLUDED.published_at,
        updated_at = now()
     RETURNING id`,
    [
      l.wp_post_id, l.slug, l.title, l.description, l.status, l.transaction_type, l.price,
      l.bedrooms, l.bathrooms, l.rooms, l.size_sqm, l.land_sqm, l.floor, l.year_built,
      l.energy_class, l.condition, l.address, l.city, l.province, l.postal_code,
      l.latitude, l.longitude, l.qr_code_url, agentId, l.published_at,
    ],
  );
  const id = rows[0].id;

  // Keep the PostGIS point in sync when coords are present.
  if (l.latitude != null && l.longitude != null) {
    await client.query(
      `UPDATE listings
          SET location = ST_SetSRID(ST_MakePoint($2,$3),4326)::geography,
              geocoded_at = COALESCE(geocoded_at, now()),
              geocode_source = COALESCE(geocode_source, 'wordpress')
        WHERE id = $1`,
      [id, l.longitude, l.latitude],
    );
  }
  return id;
}
