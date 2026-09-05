import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { CreateBucketCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';

/**
 * Integration harness — Phase 34.
 *
 * Spins up Postgres from `infra/postgres/Dockerfile` (PostGIS + pgvector from
 * source) and Meilisearch, applies REAL migrations, then boots the REAL
 * `AppModule` with `JwtAuthGuard` swapped for `TestAuthGuard` via
 * `overrideProvider` (requires AuthModule APP_GUARD to use `useExisting`).
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

const MEILI_IMAGE = 'getmeili/meilisearch:v1.10';
export const PG_IMAGE = 'easycasa-postgres-int';
const INT_WA_SECRET = 'int-test-wa-secret';
const INT_WA_HANDLE_SECRET = 'int-test-wa-handle-secret';

/** Captured before any spec stubs `globalThis.fetch` (Meili + Graph use it). */
const nativeFetch = globalThis.fetch.bind(globalThis);

/** Undo `vi.stubGlobal('fetch')` so later files can talk to Meili. */
export function restoreNativeFetch(): void {
  globalThis.fetch = nativeFetch;
}

/** Meili on a loaded GH runner often exceeds the 60s default HTTP wait. */
export function meiliWait() {
  return Wait.forHttp('/health', 7700).withStartupTimeout(120_000);
}

/** Same `docker build` path as `.github/workflows/omi-load.yml` (testcontainers fromDockerfile flakes on empty TARGETPLATFORM). */
export function ensurePostgresImage(): string {
  try {
    execFileSync('docker', ['image', 'inspect', PG_IMAGE], { stdio: 'ignore' });
    return PG_IMAGE;
  } catch {
    const postgresContext = path.resolve(process.cwd(), '../../infra/postgres');
    execFileSync('docker', ['build', '-t', PG_IMAGE, postgresContext], { stdio: 'inherit' });
    return PG_IMAGE;
  }
}

/** Shared across int specs in one vitest fork (lazy pool + one AppModule boot). */
let shared: Promise<IntegrationContext> | null = null;

export async function startIntegration(): Promise<IntegrationContext> {
  restoreNativeFetch();
  if (!shared) {
    shared = bootOnce().catch((err) => {
      shared = null;
      throw err;
    });
  }
  const ctx = await shared;
  return {
    app: ctx.app,
    databaseUrl: ctx.databaseUrl,
    // Keep PG + Meili + MinIO + AppModule for later files in this vitest worker.
    // Aste specs that need an AI mock must set AI_URL + resetConfigCache()
    // and must not start a second container stack (that kills shared Meili).
    stop: async () => undefined,
  };
}

async function bootOnce(): Promise<IntegrationContext> {
  ensurePostgresImage();

  const pg: StartedPostgreSqlContainer = await new PostgreSqlContainer(PG_IMAGE)
    .withDatabase('easycasa_test')
    .withUsername('easycasa')
    .withPassword('easycasa')
    .start();

  const meili: StartedTestContainer = await new GenericContainer(MEILI_IMAGE)
    .withEnvironment({ MEILI_MASTER_KEY: 'test', MEILI_ENV: 'development' })
    .withExposedPorts(7700)
    .withWaitStrategy(meiliWait())
    .start();

  const minio: StartedTestContainer = await new GenericContainer(
    'minio/minio:RELEASE.2024-12-18T13-15-44Z',
  )
    .withEnvironment({
      MINIO_ROOT_USER: 'easycasa',
      MINIO_ROOT_PASSWORD: 'change_me_minio',
    })
    .withExposedPorts(9000)
    .withCommand(['server', '/data'])
    .withWaitStrategy(Wait.forLogMessage(/API:.*/))
    .start();

  const databaseUrl = pg.getConnectionUri();
  const meiliUrl = `http://${meili.getHost()}:${meili.getMappedPort(7700)}`;
  const minioEndpoint = `http://${minio.getHost()}:${minio.getMappedPort(9000)}`;
  const s3 = new S3Client({
    endpoint: minioEndpoint,
    region: 'us-east-1',
    forcePathStyle: true,
    credentials: { accessKeyId: 'easycasa', secretAccessKey: 'change_me_minio' },
  });
  try {
    await s3.send(new HeadBucketCommand({ Bucket: 'easycasa-media' }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: 'easycasa-media' }));
  }

  process.env.NODE_ENV = 'test';
  process.env.ALLOW_PROVIDER_STUBS = 'true';
  process.env.EC_TEST_AUTH = 'true';
  process.env.DATABASE_URL = databaseUrl;
  process.env.MEILI_URL = meiliUrl;
  process.env.MEILI_MASTER_KEY = 'test';
  process.env.API_PORT = '4000';
  process.env.S3_ENDPOINT = minioEndpoint;
  process.env.MINIO_ROOT_USER = 'easycasa';
  process.env.MINIO_ROOT_PASSWORD = 'change_me_minio';
  process.env.MINIO_BUCKET = 'easycasa-media';
  // Flag-off 404s stay in AsteAnalysisEnabledGuard unit tests.
  process.env.ASTE_ANALYSIS_ENABLED = 'true';
  process.env.EC_INT_HARNESS = '1';
  // Do not inherit runner/org mail gateways — inbound tests assert noop
  // `forward_error`, and HTTP email would also steal the WhatsApp fetch mock.
  process.env.SMTP_URL = '';
  process.env.EMAIL_PROVIDER_URL = '';
  // Force test secrets — do not inherit a runner/org WHATSAPP_APP_SECRET.
  process.env.WHATSAPP_APP_SECRET = INT_WA_SECRET;
  process.env.WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || 'int-tok';
  process.env.WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || 'int-pnid';
  process.env.WHATSAPP_INBOUND_OPS_EMAIL =
    process.env.WHATSAPP_INBOUND_OPS_EMAIL || 'ops@example.com';
  process.env.WA_HANDLE_SECRET = INT_WA_HANDLE_SECRET;

  const { resetConfigCache } = await import('../../src/config');
  resetConfigCache();
  const { resetDbConnection } = await import('../../src/db/drizzle');
  await resetDbConnection();
  const { resetMeiliClient } = await import('../../src/search/meili');
  resetMeiliClient();

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
    .overrideProvider(JwtAuthGuard)
    .useClass(TestAuthGuard)
    .compile();

  const app = moduleRef.createNestApplication({ rawBody: true });
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
      await minio.stop().catch(() => undefined);
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
