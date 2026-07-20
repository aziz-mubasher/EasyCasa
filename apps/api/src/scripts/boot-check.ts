/**
 * Headless composition-root boot check — Phase 33.
 *
 * Builds the real AppModule and runs `app.init()` (no listener) so a broken DI
 * graph fails CI. Env is seeded before any Nest import so `loadApiConfig` /
 * Drizzle see DEV_AUTH test values (OIDC not required).
 *
 * Run: `node apps/api/dist/scripts/boot-check.js` (see .github/workflows/api-boot.yml).
 */
import 'reflect-metadata';

const TEST_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  DEV_AUTH: 'true',
  DATABASE_URL: 'postgresql://easycasa:easycasa@127.0.0.1:5432/easycasa_test',
  MEILI_URL: 'http://127.0.0.1:7700',
  MEILI_MASTER_KEY: 'test',
  API_PORT: '4000',
};

async function main(): Promise<void> {
  for (const [k, v] of Object.entries(TEST_ENV)) {
    if (!process.env[k]) process.env[k] = v;
  }

  const { NestFactory } = await import('@nestjs/core');
  const { resetConfigCache } = await import('../config');
  resetConfigCache();
  const { AppModule } = await import('../app.module');

  const app = await NestFactory.create(AppModule, { logger: false });
  await app.init();

  const server = app.getHttpAdapter().getInstance() as {
    _router?: { stack?: Array<{ route?: { path?: string } }> };
  };
  const paths = (server._router?.stack ?? [])
    .map((l) => l.route?.path)
    .filter((p): p is string => typeof p === 'string');
  const healthPresent = paths.some((p) => p.includes('health'));

  await app.close();

  if (!healthPresent) {
    console.error('BOOT FAIL — /health route not registered');
    process.exit(1);
  }
  console.log('BOOT OK — DI graph resolved; /health registered');
  process.exit(0);
}

main().catch((err) => {
  console.error('BOOT FAIL —', err instanceof Error ? err.message : err);
  process.exit(1);
});
