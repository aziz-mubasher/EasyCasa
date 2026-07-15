import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

// Load repo-root .env then package .env (latter wins). Safe when files are absent.
loadDotenv({ path: resolve(process.cwd(), '../.env') });
loadDotenv({ path: resolve(process.cwd(), '.env') });

const Schema = z.object({
  // Target Postgres
  DATABASE_URL: z.string().url(),

  // Source WordPress MySQL
  WP_DB_HOST: z.string().default('127.0.0.1'),
  WP_DB_PORT: z.coerce.number().default(3306),
  WP_DB_USER: z.string().default('root'),
  WP_DB_PASSWORD: z.string().default(''),
  WP_DB_NAME: z.string().default('wordpress'),
  WP_TABLE_PREFIX: z.string().default('wp_'),

  // WordPress content mapping (tune after wp-audit)
  WP_LISTING_POST_TYPE: z.string().default('estate_property'),
  WP_PERMALINK_BASE: z.string().default(''),   // e.g. "" or "/property"
  WP_UPLOADS_BASE_URL: z.string().default('https://easycasaita.com/wp-content/uploads'),

  // Geocoding
  GEOCODER: z.enum(['nominatim', 'none']).default('nominatim'),
  NOMINATIM_URL: z.string().default('https://nominatim.openstreetmap.org/search'),
  GEOCODER_USER_AGENT: z.string().default('EasyCasaMigration/1.0 (ops@easycasaita.com)'),

  // Object storage (MinIO / S3)
  S3_ENDPOINT: z.string().default('http://minio:9000'),
  S3_REGION: z.string().default('us-east-1'),
  MINIO_ROOT_USER: z.string().default('easycasa'),
  MINIO_ROOT_PASSWORD: z.string().default('change_me_minio'),
  MINIO_BUCKET: z.string().default('easycasa-media'),
  MEDIA_PUBLIC_BASE: z.string().default('https://cdn.easycasaita.com'),
});

export type Config = z.infer<typeof Schema>;
export const config: Config = Schema.parse(process.env);

export function wpTable(name: string): string {
  return `${config.WP_TABLE_PREFIX}${name}`;
}
