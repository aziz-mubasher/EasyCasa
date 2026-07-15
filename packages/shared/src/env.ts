import { z } from 'zod';

/**
 * Central runtime env schema. Import getEnv() anywhere env is needed so we
 * fail fast with a clear message instead of hitting undefined values later.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().optional(),
  MEILI_URL: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function getEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return EnvSchema.parse(source);
}
