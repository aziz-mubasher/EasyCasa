import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';

/**
 * Integration harness — Phase 34.
 *
 * Spins up Postgres (PostGIS image + pgvector install, matching
 * `infra/postgres/Dockerfile`) and Meilisearch, applies REAL migrations, then
 * boots the REAL `AppModule` with `JwtAuthGuard` swapped for `TestAuthGuard`.
 *
 * No Nest global `/api` prefix — Traefik strips `/api` in production; tests hit
 * the same paths the app listens on (`/health`, `/search/bounds`, …).
 *
 * Requires Docker. Specs gate via `dockerAvailable()`.
 */
export interface IntegrationContext {
  app: INestApplication;
  databaseUrl: string;
  stop: () => Promise<void>;
}

const PG_IMAGE = 'postgis/postgis:16-3.4';
const MEILI_IMAGE = 'getmeili/meilisearch:v1.10';

/** Shared across int specs in one vitest fork (lazy pool + one AppModule boot). */
let shared: Promise<IntegrationContext> | null = null;
let refs = 0;

export async function startIntegration(): Promise<IntegrationContext> {
  if (!shared) shared = bootOnce();
  const ctx = await shared;
  refs += 1;
  return {
    app: ctx.app,
    databaseUrl: ctx.databaseUrl,
    stop: async () => {
      refs -= 1;
      if (refs > 0) return;
      await ctx.stop();
    },
  };
}

async function bootOnce(): Promise<IntegrationContext> {
  const pg: StartedPostgreSqlContainer = await new PostgreSqlContainer(PG_IMAGE)
    .withDatabase('easycasa_test')
    .withUsername('easycasa')
    .withPassword('easycasa')
    .start();

  // Match infra/postgres/Dockerfile — postgis image alone lacks pgvector.
  const install = await pg.exec([
    'bash',
    '-c',
    'apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends postgresql-16-pgvector',
  ]);
  if (install.exitCode !== 0) {
    await pg.stop();
    throw new Error(`pgvector install failed: ${install.output}`);
  }

  const meili: StartedTestContainer = await new GenericContainer(MEILI_IMAGE)
    .withEnvironment({ MEILI_MASTER_KEY: 'test', MEILI_ENV: 'development' })
    .withExposedPorts(7700)
    .withWaitStrategy(Wait.forHttp('/health', 7700))
    .start();

  const databaseUrl = pg.getConnectionUri();
  const meiliUrl = `http://${meili.getHost()}:${meili.getMappedPort(7700)}`;

  process.env.NODE_ENV = 'test';
  process.env.DEV_AUTH = 'true';
  process.env.DATABASE_URL = databaseUrl;
  process.env.MEILI_URL = meiliUrl;
  process.env.MEILI_MASTER_KEY = 'test';
  process.env.API_PORT = '4000';

  const { resetConfigCache } = await import('../../src/config');
  resetConfigCache();
  const { resetDbConnection } = await import('../../src/db/drizzle');
  await resetDbConnection();

  // Real migrations via the repo runner (0001…0019), not a re-implementation.
  const repoRoot = path.resolve(process.cwd(), '../..');
  execFileSync('pnpm', ['--filter', '@easycasa/migration', 'migrate'], {
    stdio: 'inherit',
    cwd: repoRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  const { AppModule } = await import('../../src/app.module');
  const { JwtAuthGuard } = await import('../../src/auth/jwt.guard');
  const { TestAuthGuard } = await import('./test-auth');

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(JwtAuthGuard)
    .useClass(TestAuthGuard)
    .compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
  );
  await app.init();

  return {
    app,
    databaseUrl,
    stop: async () => {
      await app.close().catch(() => undefined);
      await resetDbConnection();
      await meili.stop().catch(() => undefined);
      await pg.stop().catch(() => undefined);
      shared = null;
    },
  };
}

/** True when a Docker daemon is reachable; used to skip container specs elsewhere. */
export function dockerAvailable(): boolean {
  try {
    execFileSync('docker', ['info'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
