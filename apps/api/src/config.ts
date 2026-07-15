import { z } from 'zod';

const bool = (def: boolean) =>
  z.string().optional().transform((v) => (v == null ? def : v === 'true'));

const Schema = z.object({
  API_PORT: z.coerce.number().default(4000),
  NODE_ENV: z.string().default('production'),
  DATABASE_URL: z.string().url(),

  // Auth (OIDC). In dev, DEV_AUTH=true trusts x-dev-* headers instead.
  DEV_AUTH: bool(false),
  OIDC_ISSUER: z.string().optional(),
  OIDC_AUDIENCE: z.string().optional(),
  OIDC_JWKS_URL: z.string().optional(),
  OIDC_ROLES_CLAIM: z.string().default('roles'),

  // Object storage (MinIO / S3)
  S3_ENDPOINT: z.string().default('http://minio:9000'),
  S3_REGION: z.string().default('us-east-1'),
  MINIO_ROOT_USER: z.string().default('easycasa'),
  MINIO_ROOT_PASSWORD: z.string().default('change_me_minio'),
  MINIO_BUCKET: z.string().default('easycasa-media'),
  MEDIA_PUBLIC_BASE: z.string().default('http://localhost:9000/easycasa-media'),
});

export type ApiConfig = z.infer<typeof Schema>;
export const apiConfig: ApiConfig = Schema.parse(process.env);
